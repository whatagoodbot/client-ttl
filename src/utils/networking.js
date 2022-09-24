import fetch from 'node-fetch'

export const buildUrl = (host, paths = [], searchParams, protocol = 'https') => {
  const url = new URL(paths.join('/'), `${protocol}://${host}`)
  const params = new URLSearchParams(searchParams)
  url.search = params
  return url
}

export const makeRequest = async (url, options, extraHeaders) => {
  const requestOptions = {
    headers: {
      accept: 'application/json',
      'accept-language': 'en-ZA,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,af;q=0.6',
      'cache-control': 'max-age=0',
      'content-type': 'application/json',
      ...extraHeaders
    },
    ...options
  }
  const response = await fetch(url.href, requestOptions)
  const responsePayload = await response.json()

  return responsePayload
}
