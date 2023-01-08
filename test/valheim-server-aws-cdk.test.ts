import { Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { ValheimServerAwsCdkStack } from "../lib/valheim-server-aws-cdk-stack";

describe("Valheim Server stacks", () => {
  test("Snapshot", () => {
    const stack = new Stack();
    new ValheimServerAwsCdkStack(
      stack,
      "MyTestStack"
    );
  
    expect(Template.fromStack(stack)).toMatchSnapshot();
  });
})