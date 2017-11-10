/**
 * Examples of spdzProxyList usually read at startup from config
 * and spdzConnectionStatus usually derived after connecting or disconnecting.
 */
import ProxyStatusCodes from '../ProxyStatusCodes'

const noProxiesSpdzConfig = []

const twoProxiesSpdzConfig = [
  {
    url: 'http://spdzProxy.one:4000',
    publicKey:
      '0102030405060708010203040506070801020304050607080102030405060708',
    encryptionKey:
      'AA02030405060708010203040506070801020304050607080102030405060708'
  },
  {
    url: 'http://spdzProxy.two:4000',
    publicKey:
      '3302030405060708010203040506070801020304050607080102030405060708',
    encryptionKey:
      'BB02030405060708010203040506070801020304050607080102030405060708'
  }
]

const twoProxiesWith0Connected = [
  {
    url: 'http://spdzProxy.one:4000',
    status: ProxyStatusCodes.Disconnected
  },
  {
    url: 'http://spdzProxy.two:4000',
    status: ProxyStatusCodes.Disconnected
  }
]

const twoProxiesWith1Connected = [
  {
    url: 'http://spdzProxy.one:4000',
    status: ProxyStatusCodes.Failure
  },
  {
    url: 'http://spdzProxy.two:4000',
    status: ProxyStatusCodes.Connected
  }
]

const twoProxiesWith2Connected = [
  {
    url: 'http://spdzProxy.one:4000',
    status: ProxyStatusCodes.Connected,
    clientId: '111'
  },
  {
    url: 'http://spdzProxy.two:4000',
    status: ProxyStatusCodes.Connected,
    clientId: '222'
  }
]

export {
  noProxiesSpdzConfig,
  twoProxiesSpdzConfig,
  twoProxiesWith0Connected,
  twoProxiesWith1Connected,
  twoProxiesWith2Connected
}
