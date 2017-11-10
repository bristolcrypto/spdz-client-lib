import logger from './logging'
/* eslint no-console: 0 */

console.log = jest.fn().mockImplementation(() => {})

describe('Check browser logger', () => {
  beforeEach(() => {
    console.log.mockClear()
  })
  it('At debug level all levels log', () => {
    logger.level = 'debug'
    logger.debug('debug message', 1, 'foo')
    logger.info('info message', 1, 'foo')
    logger.warn('warn message', 1, 'foo')
    logger.error('error message', 1, 'foo')

    expect(logger.level).toEqual('debug')
    expect(console.log).toHaveBeenCalledTimes(4)
  })
  it('At info level all but 1 levels log', () => {
    logger.level = 'info'
    logger.debug('debug message', 1, 'foo')
    logger.info('info message', 1, 'foo')
    logger.warn('warn message', 1, 'foo')
    logger.error('error message', 1, 'foo')

    expect(logger.level).toEqual('info')
    expect(console.log).toHaveBeenCalledTimes(3)
  })
  it('At warn level 2 levels log', () => {
    logger.level = 'warn'
    logger.debug('debug message', 1, 'foo')
    logger.info('info message', 1, 'foo')
    logger.warn('warn message', 1, 'foo')
    logger.error('error message', 1, 'foo')

    expect(logger.level).toEqual('warn')
    expect(console.log).toHaveBeenCalledTimes(2)
  })
  it('At error level 1 level logs', () => {
    logger.level = 'error'
    logger.debug('debug message', 1, 'foo')
    logger.info('info message', 1, 'foo')
    logger.warn('warn message', 1, 'foo')
    logger.error('error message', 1, 'foo')

    expect(logger.level).toEqual('error')
    expect(console.log).toHaveBeenCalledTimes(1)
  })
})
