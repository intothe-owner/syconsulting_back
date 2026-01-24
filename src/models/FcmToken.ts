import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../db/sequelize";

/**
 * ✅ 디바이스별 FCM 토큰 저장 테이블 (UserId 없음)
 * - deviceId: 디바이스 고유 식별자(앱에서 생성해서 유지하는 UUID 권장)
 * - token: FCM registration token (유니크)
 * - platform: android/ios/web 등
 * - deviceModel/osVersion/appVersion: 관리/디버깅용(선택)
 * - isActive: 토큰 유효 여부(실패 토큰 비활성화/정리용)
 * - lastSeenAt: 마지막 등록/갱신 시각
 */
export class FcmToken extends Model<
  InferAttributes<FcmToken>,
  InferCreationAttributes<FcmToken>
> {
  declare id: CreationOptional<number>;

  declare deviceId: string;
  declare token: string;

  declare platform: "android" | "ios" | "web" | "unknown";
  declare deviceModel: string | null;
  declare osVersion: string | null;
  declare appVersion: string | null;

  declare isActive: CreationOptional<boolean>;
  declare lastSeenAt: CreationOptional<Date>;

  // ✅ timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

FcmToken.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "FCM 토큰 ID",
    },

    deviceId: {
      type: DataTypes.STRING(128),
      allowNull: false,
      comment: "디바이스 식별자(UUID 권장, 앱에서 생성해 고정 저장)",
    },

    token: {
      type: DataTypes.STRING(512),
      allowNull: false,
      comment: "FCM registration token",
    },

    platform: {
      type: DataTypes.ENUM("android", "ios", "web", "unknown"),
      allowNull: false,
      defaultValue: "android",
      comment: "플랫폼",
    },

    deviceModel: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: "디바이스 모델(선택)",
    },

    osVersion: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: "OS 버전(선택)",
    },

    appVersion: {
      type: DataTypes.STRING(32),
      allowNull: true,
      comment: "앱 버전(선택)",
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "토큰 활성 여부(실패 토큰 비활성화/정리용)",
    },

    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "마지막 등록/갱신 시각",
    },

    // ✅ createdAt/updatedAt 명시(Notice처럼 타입 에러 방지)
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
    tableName: "fcm_tokens",
    timestamps: true,
    underscored: true,
    comment: "디바이스별 FCM 토큰",
    indexes: [
      // ✅ 토큰은 고유(중복 저장 방지)
      { name: "ux_fcm_tokens_token", unique: true, fields: ["token"] },

      // ✅ 디바이스는 1개당 1토큰 정책(일반적으로 이게 편함)
      // 토큰이 바뀌면 같은 device_id 레코드를 업데이트하면 됨
      { name: "ux_fcm_tokens_device_id", unique: true, fields: ["device_id"] },

      // ✅ 활성 토큰 조회 최적화
      { name: "idx_fcm_tokens_active", fields: ["is_active"] },

      // ✅ 최근 갱신 순 정리/모니터링용
      { name: "idx_fcm_tokens_last_seen_at", fields: ["last_seen_at"] },
    ],
  }
);
