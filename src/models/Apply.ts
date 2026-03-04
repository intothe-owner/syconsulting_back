import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../db/sequelize";

/**
 * 수강신청(Apply) 테이블
 * - 프론트 FormState 기반
 * - phoneDigits / address 는 서버에서 만들어 저장(선택)
 */
export class Apply extends Model<
  InferAttributes<Apply>,
  InferCreationAttributes<Apply>
> {
  declare id: CreationOptional<number>;

  declare classType: "AI" | "CODING";
  declare name: string;

  // 폼에서 하이픈 포함 문자열(저장해도 되고, digits만 저장해도 됨)
  declare phone: string;

  // 숫자만(검색/중복체크/문자발송 연동 등에서 유용)
  declare phoneDigits: string;

  declare district: string;
  declare neighborhoodDetail: string;

  // 편의상 합친 주소(옵션)
  declare address: string;

  declare motivation: string;
  // 지인추천
  declare recommender: string;
  declare howFound:
    | "홈페이지"
    | "지인추천"
    | "인스타그램"
    | "유튜브"
    | "검색"
    | "현수막·전단"
    | "기타";

  declare privacyAgree: boolean;

  // (선택) 운영에서 처리 상태를 쓰고 싶으면 활용
  declare status: CreationOptional<"NEW" | "CONTACTED" | "DONE" | "CANCELLED">;

  // timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Apply.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "수강신청 ID",
    },

    classType: {
      type: DataTypes.ENUM("AI", "CODING"),
      allowNull: false,
      comment: "수업 종류",
    },

    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "신청자 이름",
    },

    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: "연락처(표기용, 하이픈 포함 가능)",
    },

    phoneDigits: {
      type: DataTypes.STRING(11),
      allowNull: false,
      comment: "연락처(숫자만)",
    },

    district: {
      type: DataTypes.STRING(30),
      allowNull: false,
      comment: "부산 구/군",
    },

    neighborhoodDetail: {
      type: DataTypes.STRING(60),
      allowNull: false,
      comment: "동/읍/면 상세",
    },

    address: {
      type: DataTypes.STRING(120),
      allowNull: false,
      comment: "주소(구/군 + 동/읍/면)",
    },

    motivation: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
      comment: "지원동기",
    },
    recommender: {
      type: DataTypes.STRING(120),
      allowNull: true,
      comment: "추천인",
    },
    howFound: {
      type: DataTypes.ENUM(
        "홈페이지",
        "지인추천",
        "인스타그램",
        "유튜브",
        "검색",
        "현수막·전단",
        "기타"
      ),
      allowNull: false,
      comment: "유입경로",
    },

    privacyAgree: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "개인정보처리방침 동의",
    },

    status: {
      type: DataTypes.ENUM("NEW", "CONTACTED", "DONE", "CANCELLED"),
      allowNull: false,
      defaultValue: "NEW",
      comment: "처리상태",
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
    tableName: "applies",
    timestamps: true,
    underscored: true,
    comment: "수강신청",
    indexes: [
      { name: "idx_applies_created_at", fields: ["created_at"] },
      { name: "idx_applies_class_type", fields: ["class_type"] },
      { name: "idx_applies_phone_digits", fields: ["phone_digits"] },
      { name: "idx_applies_district", fields: ["district"] },
      { name: "idx_applies_how_found", fields: ["how_found"] },
      { name: "idx_applies_status", fields: ["status"] },
    ],
  }
);
