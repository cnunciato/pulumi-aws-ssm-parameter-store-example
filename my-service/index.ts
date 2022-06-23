import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const stack = new pulumi.StackReference("cnunciato/shared-config/dev");
const motdParamRef = stack.requireOutput("motd_param");
const motdSecretParamRef = stack.requireOutput("motd_secret_param");

const callback = new aws.lambda.CallbackFunction("lambda", {
    policies: [
        aws.iam.ManagedPolicy.AmazonSSMReadOnlyAccess,
        aws.iam.ManagedPolicy.LambdaFullAccess
    ],
    callback: async () => {
        const ssm = new aws.sdk.SSM();

        const motdParam = await ssm.getParameter({
            Name: motdParamRef.get().name,
        }).promise();

        const motdSecretParam = await ssm.getParameter({
            Name: motdSecretParamRef.get().name,
            WithDecryption: true,
        }).promise();

        return {
            statusCode: 200,
            contentType: "application/json",
            body: JSON.stringify({
                motd: motdParam.Parameter?.Value,
                motdSecret: motdSecretParam.Parameter?.Value
            }),
        };
    },
});

const lambdaUrl = new aws.lambda.FunctionUrl("lambda-url", {
    functionName: callback.name,
    authorizationType: "NONE",
});

export const url = lambdaUrl.functionUrl;
