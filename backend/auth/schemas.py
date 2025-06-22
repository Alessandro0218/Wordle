from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql.schema import UniqueConstraint

Base = declarative_base()


class UserORM(Base):
    __tablename__ = "user"
    __table_args__ = (UniqueConstraint("discord_id", name="uq_user_discord_id"),)

    id = Column(Integer, primary_key=True, index=True)
    discord_id = Column(String(255), nullable=False)
    discord_username = Column(String(255), nullable=False)
    discord_avatar = Column(String(255), nullable=False)
    discord_token = Column(String(255), nullable=True)
    discord_refresh_token = Column(String(255), nullable=True)
