import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signRequest, sha256Hex } from '../src/sign.js'

/* Official aws-sig-v4-test-suite vector: get-vanilla-query-order-key-case
   (service='service', host=example.amazonaws.com, 20150830T123600Z). */
test('signRequest produces the canonical AWS signature', () => {
  const { headers } = signRequest({
    method: 'GET',
    path: '/',
    query: { Param1: 'value1', Param2: 'value2' },
    host: 'example.amazonaws.com',
    includePayloadHash: false,
    region: 'us-east-1',
    service: 'service',
    accessKeyId: 'AKIDEXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
    now: new Date('2015-08-30T12:36:00Z'),
  })
  assert.equal(headers['x-amz-date'], '20150830T123600Z')
  assert.equal(
    headers.authorization,
    'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=b97d918cfa904a5beff61c982a1b6f458b799221646efd99d3219ec94cdf2500',
  )
})

test('signRequest emits S3 payload hash + signed content-type', () => {
  const body = new TextEncoder().encode('hello')
  const { headers, signedHeaders } = signRequest({
    method: 'PUT', path: '/bucket/k.txt', host: 'bkt.s3.us-east-1.amazonaws.com',
    headers: { 'content-type': 'text/plain' }, payload: body,
    region: 'us-east-1', service: 's3',
    accessKeyId: 'AK', secretAccessKey: 'SK',
    now: new Date('2026-01-01T00:00:00Z'),
  })
  assert.equal(headers['x-amz-content-sha256'], sha256Hex(body))
  assert.ok(signedHeaders.includes('content-type'))
  assert.ok(signedHeaders.includes('x-amz-content-sha256'))
})

test('empty body hashes the empty payload', () => {
  assert.equal(sha256Hex(new Uint8Array(0)), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
})
