import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Port, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Cluster, Compatibility, ContainerImage, FargatePlatformVersion, FargateService, LogDrivers, MountPoint, NetworkMode, Protocol, Secret, TaskDefinition, Volume } from "aws-cdk-lib/aws-ecs";
import { FileSystem } from "aws-cdk-lib/aws-efs";
import { Secret as SecretsManagerSecret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export class ValheimServerAwsCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // MUST BE DEFINED BEFORE RUNNING CDK DEPLOY! Key Value should be: VALHEIM_SERVER_PASS
    const valheimServerPass = SecretsManagerSecret.fromSecretNameV2(
      this,
      "predefinedValheimServerPass",
      "valheimServerPass"
    );

    const vpc = new Vpc(this, "valheimVpc", {
      cidr: "10.0.0.0/24",
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "valheimPublicSubnet",
          subnetType: SubnetType.PUBLIC,
        },
      ],
      maxAzs: 1,
    });
    const fargateCluster = new Cluster(this, "fargateCluster", {
      vpc: vpc,
    });

    const serverFileSystem = new FileSystem(this, "valheimServerStorage", {
      vpc: vpc,
      encrypted: true,
    });

    const serverVolumeConfig: Volume = {
      name: "valheimServerVolume",
      efsVolumeConfiguration: {
        fileSystemId: serverFileSystem.fileSystemId,
      },
    };

    const mountPoint: MountPoint = {
      containerPath: "/config",
      sourceVolume: serverVolumeConfig.name,
      readOnly: false,
    };

    const valheimTaskDefinition = new TaskDefinition(
      this,
      "valheimTaskDefinition",
      {
        compatibility: Compatibility.FARGATE,
        cpu: "2048",
        memoryMiB: "4096",
        volumes: [serverVolumeConfig],
        networkMode: NetworkMode.AWS_VPC,
      }
    );

    // Valheim server environment variables
    // https://github.com/lloesche/valheim-server-docker#environment-variables
    const environment: Record<string, string> = Object.entries(process.env)
      .filter(([key]) => key.startsWith("VALHEIM_DOCKER_"))
      .reduce((a, [k, v]) => ({ ...a, [k]: v}), {});

    const container = valheimTaskDefinition.addContainer("valheimContainer", {
      image: ContainerImage.fromRegistry("lloesche/valheim-server"),
      logging: LogDrivers.awsLogs({ streamPrefix: "ValheimServer" }),
      environment,
      secrets: {
        SERVER_PASS: Secret.fromSecretsManager(
          valheimServerPass,
          "VALHEIM_SERVER_PASS"
        ),
      },
    });

    container.addPortMappings(
      {
        containerPort: 2456,
        hostPort: 2456,
        protocol: Protocol.UDP,
      },
      {
        containerPort: 2457,
        hostPort: 2457,
        protocol: Protocol.UDP,
      },
      {
        containerPort: 2458,
        hostPort: 2458,
        protocol: Protocol.UDP,
      }
    );

    container.addMountPoints(mountPoint);

    const valheimService = new FargateService(this, "valheimService", {
      cluster: fargateCluster,
      taskDefinition: valheimTaskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      platformVersion: FargatePlatformVersion.VERSION1_4,
    });

    serverFileSystem.connections.allowDefaultPortFrom(valheimService);
    valheimService.connections.allowFromAnyIpv4(
      new Port({
        protocol: Protocol.UDP,
        stringRepresentation: "valheimPorts",
        fromPort: 2456,
        toPort: 2458,
      })
    );

    new CfnOutput(this, "serviceName", {
      value: valheimService.serviceName,
      exportName: "fargateServiceName",
    });

    new CfnOutput(this, "clusterArn", {
      value: fargateCluster.clusterName,
      exportName:"fargateClusterName"
    });

    new CfnOutput(this, "EFSId", {
      value: serverFileSystem.fileSystemId
    })
  }
}
