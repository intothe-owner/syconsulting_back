import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../db/sequelize";

export class Qna extends Model<InferAttributes<Qna>, InferCreationAttributes<Qna>> {
  declare id: CreationOptional<number>;

  declare category: string; // 카테고리
  declare question: string; // 질문
  declare answer: CreationOptional<string | null>; // 답변(없을 수 있음)

  declare views: CreationOptional<number>; // 조회수
  declare answered: CreationOptional<boolean>; // 답변 완료 여부

  // ✅ 비밀글/비밀번호(해시)
  declare isSecret: CreationOptional<boolean>;
  declare passwordHash: CreationOptional<string | null>;

  // ✅ 자동방지번호/캡차 관련(서버 검증을 붙일 경우 대비)
  // - "자동방지번호 이미지"는 보통 저장 안 함
  // - 필요하면 제출 시도/차단을 위해 토큰/검증값 일부를 저장할 수 있음(옵션)
  declare captchaVerifiedAt: CreationOptional<Date | null>;

  // ✅ timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Qna.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "Q&A ID",
    },

    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "기타",
      comment: "카테고리",
    },

    question: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: "질문",
    },

    answer: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      comment: "답변(없으면 NULL)",
    },

    views: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "조회수",
    },

    answered: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "답변완료 여부",
    },

    isSecret: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "비밀글 여부",
      field: "is_secret",
    },

    passwordHash: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: "비밀글 비밀번호 해시(평문 저장 금지)",
      field: "password_hash",
    },

    captchaVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "자동방지번호(캡차) 확인 완료 시각(옵션)",
      field: "captcha_verified_at",
    },

    // ✅ createdAt/updatedAt을 attributes에 명시 (Notice 방식 그대로)
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "생성일",
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "수정일",
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "qna",
    timestamps: true,
    underscored: true,
    comment: "Q&A",
    indexes: [
      { name: "idx_qna_created_at", fields: ["created_at"] },
      { name: "idx_qna_category", fields: ["category"] },
      { name: "idx_qna_answered", fields: ["answered"] },
      { name: "idx_qna_is_secret", fields: ["is_secret"] },
    ],
  }
);
