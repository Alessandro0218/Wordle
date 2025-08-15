from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.auth.schemas import Base, UserORM

DB_USER = "root"
DB_PASSWORD = "root"
DB_HOST = "localhost"
DB_PORT = 3306
DB_NAME = "wordle"

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


class Database:
    def __init__(self):
        self.engine = create_engine(DATABASE_URL, echo=False)
        self.SessionLocal = sessionmaker(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)

    def get_session(self):
        return self.SessionLocal()

    def close_session(self, session):
        session.close()

    def get_user_by_discord_id(self, discord_id: str) -> UserORM | None:
        session = self.get_session()
        try:
            user = session.query(UserORM).filter(UserORM.discord_id == discord_id).first()
            return user
        except Exception as e:
            raise e
        finally:
            self.close_session(session)

    def get_user_by_id(self, user_id: int) -> UserORM | None:
        session = self.get_session()
        try:
            user = session.query(UserORM).filter(UserORM.id == user_id).first()
            return user
        except Exception as e:
            raise e
        finally:
            self.close_session(session)

    def create_user(
        self,
        discord_id: str,
        discord_username: str,
        discord_avatar: str,
        discord_token: str | None,
        discord_refresh_token: str | None,
    ) -> UserORM:
        session = self.get_session()
        try:
            existing_user = self.get_user_by_discord_id(discord_id)
            userORM = UserORM(
                discord_id=discord_id,
                discord_username=discord_username,
                discord_avatar=discord_avatar,
                discord_token=discord_token,
                discord_refresh_token=discord_refresh_token,
            )
            if existing_user is None:
                newUser = userORM
                session.add(newUser)
                session.commit()
                session.refresh(newUser)
            else:
                self.update_user(discord_id=discord_id, user=userORM)
            return existing_user
        except Exception as e:
            session.rollback()
            raise e
        finally:
            self.close_session(session)

    def update_user(
        self,
        discord_id: str,
        user: UserORM,
    ) -> UserORM:
        session = self.get_session()
        try:
            existing_user = session.query(UserORM).filter(UserORM.discord_id == discord_id).first()
            if not existing_user:
                raise ValueError("User not found")

            existing_user.discord_username = user.discord_username
            existing_user.discord_avatar = user.discord_avatar
            existing_user.discord_token = user.discord_token
            existing_user.discord_refresh_token = user.discord_refresh_token

            session.commit()
            session.refresh(existing_user)
            return existing_user
        except Exception as e:
            session.rollback()
            raise e
        finally:
            self.close_session(session)
