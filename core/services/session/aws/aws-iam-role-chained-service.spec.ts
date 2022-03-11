import { describe, test, expect } from "@jest/globals";
import { AwsIamRoleChainedSession } from "../../../models/aws-iam-role-chained-session";
import { Session } from "../../../models/session";
import { AwsIamRoleChainedService } from "./aws-iam-role-chained-service";

describe("AwsIamRoleChainedService", () => {
  test("getAccountNumberFromCallerIdentity", async () => {
    const session = new AwsIamRoleChainedSession(null, null, "abcdefghijklmnopqrstuvwxyz/12345", null, null, null);
    const awsIamRoleChainedService = new AwsIamRoleChainedService(null, null, null, null, null, null);
    const accountNumber = await awsIamRoleChainedService.getAccountNumberFromCallerIdentity(session);

    expect(accountNumber).toBe("nopqrstuvwxy");
  });

  test("getAccountNumberFromCallerIdentity - error", async () => {
    const session = {};
    const awsIamRoleChainedService = new AwsIamRoleChainedService(null, null, null, null, null, null);

    await expect(() => awsIamRoleChainedService.getAccountNumberFromCallerIdentity(session as Session)).rejects.toThrow(
      new Error("AWS IAM Role Chained Session required")
    );
  });
});
