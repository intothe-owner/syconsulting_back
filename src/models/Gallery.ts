import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../db/sequelize";

export class Gallery extends Model<
  InferAttributes<Gallery>,
  InferCreationAttributes<Gallery>
> {
  declare id: CreationOptional<number>;

  declare title: string | null;
  declare description: string | null;

  /** 원본 이미지 URL */
  declare imageUrl: string;

  /** ✅ 썸네일 이미지 URL */
  declare thumbUrl: string;

  /** 저장 key(옵션) */
  declare imageKey: string | null;
  declare thumbKey: string | null;

  declare originalName: string | null;
  declare mimeType: string | null;
  declare fileSize: number | null;

  declare width: number | null;
  declare height: number | null;

  declare sortOrder: number;
  declare isPublished: boolean;

  declare createdBy: string | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Gallery.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "갤러리 ID",
    },

    title: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: "제목",
    },
    description: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      comment: "설명",
    },

    imageUrl: {
      type: DataTypes.STRING(800),
      allowNull: false,
      comment: "원본 이미지 URL",
    },
    thumbUrl: {
      type: DataTypes.STRING(800),
      allowNull: false,
      comment: "썸네일 이미지 URL",
    },

    imageKey: {
      type: DataTypes.STRING(600),
      allowNull: true,
      comment: "원본 이미지 S3 key",
    },
    thumbKey: {
      type: DataTypes.STRING(600),
      allowNull: true,
      comment: "썸네일 이미지 S3 key",
    },

    originalName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "원본 파일명",
    },
    mimeType: {
      type: DataTypes.STRING(120),
      allowNull: true,
      comment: "MIME 타입",
    },
    fileSize: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "파일 크기(byte)",
    },

    width: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "가로(px)",
    },
    height: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "세로(px)",
    },

    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "정렬 순서",
    },

    isPublished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "공개 여부",
    },

    createdBy: {
      type: DataTypes.STRING(120),
      allowNull: true,
      comment: "작성자(관리자 식별자)",
    },

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
    tableName: "galleries",
    timestamps: true,
    underscored: true,
    comment: "갤러리 이미지",
    indexes: [
      { name: "idx_galleries_created_at", fields: ["created_at"] },
      { name: "idx_galleries_published", fields: ["is_published"] },
      { name: "idx_galleries_sort_order", fields: ["sort_order"] },
    ],
  }
);
