import { NextResponse } from 'next/server'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'

export const runtime = 'nodejs'

const region = process.env.AWS_REGION?.trim()
const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim()
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim()
const sessionToken = process.env.AWS_SESSION_TOKEN?.trim()

function hasPlaceholderValue(value: string | undefined) {
  if (!value) return true

  return /your-(aws-region|access-key-id|secret-access-key|session-token)/i.test(value)
}

export async function GET() {
  if (
    !region ||
    !accessKeyId ||
    !secretAccessKey ||
    hasPlaceholderValue(region) ||
    hasPlaceholderValue(accessKeyId) ||
    hasPlaceholderValue(secretAccessKey)
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          'AWS credentials are not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.',
        hint: 'Add valid AWS credentials in .env.local and restart the dev server.',
      },
      { status: 200 },
    )
  }

  try {
    const client = new STSClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {}),
      },
    })

    const identity = await client.send(new GetCallerIdentityCommand({}))

    return NextResponse.json({
      success: true,
      serverTimeIso: new Date().toISOString(),
      region,
      accountId: identity.Account ?? null,
      arn: identity.Arn ?? null,
      userId: identity.UserId ?? null,
      hasSessionToken: Boolean(sessionToken),
      message: 'AWS credentials are valid.',
    })
  } catch (error) {
    const awsError = error as {
      name?: string
      Code?: string
      code?: string
      message?: string
      $metadata?: { httpStatusCode?: number; requestId?: string }
    }

    const awsCode = awsError.code ?? awsError.Code ?? awsError.name ?? 'UnknownError'

    const hint =
      awsCode === 'SignatureDoesNotMatch'
        ? 'Credential signature failed. Rotate credentials, confirm session token if using temporary creds, and synchronize server/system time.'
        : awsCode === 'InvalidClientTokenId'
          ? 'Access key ID is invalid, deleted, or for a different AWS account/partition.'
          : awsCode === 'UnrecognizedClientException'
            ? 'Credentials are not recognized. Verify access key, secret key, and session token.'
            : awsCode === 'ExpiredToken'
              ? 'Session token is expired. Generate a fresh temporary credential set.'
              : null

    return NextResponse.json(
      {
        success: false,
        error: 'AWS credential validation failed.',
        awsCode,
        awsMessage: awsError.message ?? 'No AWS error message available',
        hint,
        serverTimeIso: new Date().toISOString(),
        region,
        requestId: awsError.$metadata?.requestId ?? null,
        statusCode: awsError.$metadata?.httpStatusCode ?? null,
      },
      { status: 200 },
    )
  }
}
