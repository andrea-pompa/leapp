import { describe, test, expect } from "@jest/globals";
import { AwsIamRoleFederatedSession } from "../../../models/aws-iam-role-federated-session";
import { Session } from "../../../models/session";
import { AwsIamRoleFederatedService } from "./aws-iam-role-federated-service";

describe("AwsIamRoleFederatedService", () => {
  test("getAccountNumberFromCallerIdentity", async () => {
    const session = new AwsIamRoleFederatedSession(null, null, null, null, "abcdefghijklmnopqrstuvwxyz/12345", null);
    const awsIamRoleFederatedService = new AwsIamRoleFederatedService(null, null, null, null, null, null);
    const accountNumber = await awsIamRoleFederatedService.getAccountNumberFromCallerIdentity(session);

    expect(accountNumber).toBe("nopqrstuvwxy");
  });

  test("getAccountNumberFromCallerIdentity - error", async () => {
    const session = {};
    const awsIamRoleFederatedService = new AwsIamRoleFederatedService(null, null, null, null, null, null);

    await expect(() => awsIamRoleFederatedService.getAccountNumberFromCallerIdentity(session as Session)).rejects.toThrow(
      new Error("AWS IAM Role Federated Session required")
    );
  });
});
