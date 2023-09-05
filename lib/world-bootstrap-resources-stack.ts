import { Annotations, Stack, StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export interface WorldBootstrapResourcesStackProps extends StackProps {
  worldAssetLocations: string[];
}

export default class WorldBootstrapResourcesStack extends Stack {
  public readonly bucket: Bucket;

  constructor(scope: Construct, id: string, props: WorldBootstrapResourcesStackProps) {
    super(scope, id, props);

    const { worldAssetLocations } = props;

    this.bucket = new Bucket(this, "WorldResources");

    const bucketDeployment = new BucketDeployment(this, "DeployWorlds", {
      destinationBucket: this.bucket,
      sources: worldAssetLocations.map((loc) => Source.asset(loc)),
    });

    if (worldAssetLocations.length > 1) {
      Annotations.of(bucketDeployment).addWarning("Detected there are more than one world being uploaded. Be careful! Current implementation relies on the root of the bucket containing all of '~/.config/unity3d/IronGate/Valheim/'")
    }
  }
}
