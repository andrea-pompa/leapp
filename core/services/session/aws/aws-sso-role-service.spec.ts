import { describe, test, expect } from "@jest/globals";
import { AwsSsoRoleSession } from "../../../models/aws-sso-role-session";
import { Session } from "../../../models/session";
import { AwsSsoRoleService } from "./aws-sso-role-service";

describe("AwsSsoRoleService", () => {
  test("getAccountNumberFromCallerIdentity", async () => {
    const session = new AwsSsoRoleSession(null, null, "abcdefghijklmnopqrstuvwxyz/12345", null, null, null);
    const awsSsoRoleService = new AwsSsoRoleService(null, null, null, null, null, null, { appendListener: jest.fn(() => {}) } as any);
    const accountNumber = await awsSsoRoleService.getAccountNumberFromCallerIdentity(session);

    expect(accountNumber).toBe("nopqrstuvwxy");
  });

  test("getAccountNumberFromCallerIdentity - error", async () => {
    const session = {};
    const awsSsoRoleService = new AwsSsoRoleService(null, null, null, null, null, null, { appendListener: jest.fn(() => {}) } as any);

    await expect(() => awsSsoRoleService.getAccountNumberFromCallerIdentity(session as Session)).rejects.toThrow(
      new Error("AWS SSO Role Session required")
    );
  });
});
