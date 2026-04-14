import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    ppeTypes: [],
    message: 'No PPE types configured.',
  })
}
