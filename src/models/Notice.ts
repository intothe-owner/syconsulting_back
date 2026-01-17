import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../db/sequelize";

export class Notice extends Model<
  InferAttributes<Notice>,
  InferCreationAttributes<Notice>
> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare content: string;
  declare views: CreationOptional<number>;

  // ✅ timestamps는 Sequelize가 자동 관리하므로 CreationOptional로 선언
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Notice.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "공지 ID",
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: "공지 제목",
    },
    content: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
      comment: "공지 내용",
    },
    views: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "조회수",
    },
    // ✅ createdAt/updatedAt을 attributes에 "명시"하면 타입 에러가 사라짐
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "생성일",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "수정일",
    },
  },
  {
    sequelize,
    tableName: "notices",
    timestamps: true,
    underscored: true,
    comment: "공지사항",
    indexes: [
      { name: "idx_notices_created_at", fields: ["created_at"] },
      { name: "idx_notices_title", fields: ["title"] },
    ],
  }
);
