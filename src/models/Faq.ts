import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../db/sequelize";

export class Faq extends Model<InferAttributes<Faq>, InferCreationAttributes<Faq>> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare content: string;
  declare sortOrder: CreationOptional<number>;

  // ✅ timestamps는 Sequelize가 자동 관리하므로 CreationOptional로 선언
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Faq.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "FAQ ID",
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: "제목",
    },
    content: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
      comment: "내용",
    },
    sortOrder: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "정렬 순서(작을수록 위)",
    },

    // ✅ createdAt/updatedAt을 attributes에 "명시" (Notice와 동일)
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
    tableName: "faqs",
    timestamps: true,
    underscored: true,
    comment: "FAQ",
    indexes: [
      { name: "idx_faqs_sort_order", fields: ["sort_order"] },
      { name: "idx_faqs_created_at", fields: ["created_at"] },
      { name: "idx_faqs_title", fields: ["title"] },
    ],
  }
);
