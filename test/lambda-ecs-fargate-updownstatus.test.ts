import { Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { LambdaEcsFargateUpdownstatusStack } from "../lib/lambda-ecs-fargate-updownstatus-stack";

describe("Up/Down Status Stacks", () => {
  test("Empty Stack", () => {
    const stack = new Stack();
    new LambdaEcsFargateUpdownstatusStack(
      stack,
      "MyTestStack",
      {
        serviceArn: "arn:aws:ecs::111111111111:service:1234",
        clusterArn: "arn:aws:ecs::111111111111:cluster:1234",
        startStopPassword: "foobar",
    }
    );
  
    expect(Template.fromStack(stack)).toMatchSnapshot();
  });
})