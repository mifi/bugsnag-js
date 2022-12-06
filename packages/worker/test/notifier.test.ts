import WorkerBugsnagStatic from '../src/notifier'

const API_KEY = '030bab153e7c2349be364d23b5ae93b5'

const typedGlobal: any = global

function getBugsnag (): typeof WorkerBugsnagStatic {
  const bugsnag = require('../src/notifier').default as typeof WorkerBugsnagStatic
  return bugsnag
}

function mockFetch () {
  typedGlobal.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve() }))
}

const testConfig = {
  apiKey: API_KEY,
  endpoints: { notify: '/echo/', sessions: '/echo/' },
  redactedKeys: []
}

describe('worker notifier', () => {
  beforeAll(() => {
    mockFetch()
    typedGlobal.__VERSION__ = ''
    jest.spyOn(console, 'debug').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  beforeEach(() => {
    jest.resetModules()
  })

  it('accepts plugins', () => {
    const Bugsnag = getBugsnag()
    Bugsnag.start({
      apiKey: API_KEY,
      plugins: [{
        name: 'foobar',
        load: () => 10
      }]
    })
    expect(Bugsnag.getPlugin('foobar')).toBe(10)
  })

  it('notifies handled errors', (done) => {
    const Bugsnag = getBugsnag()
    Bugsnag.start(testConfig)
    Bugsnag.notify(new Error('123'), undefined, (err, event) => {
      if (err) done(err)
      expect(event.originalError.message).toBe('123')
      expect(typedGlobal.fetch).toHaveBeenCalledWith('/echo/', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Bugsnag-Api-Key': API_KEY,
          'Bugsnag-Payload-Version': '4',
          'Bugsnag-Sent-At': expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
          'Content-Type': 'application/json'
        })
      }))
      done()
    })
  })

  it('does not send if false is returned in onError', (done) => {
    const Bugsnag = getBugsnag()
    Bugsnag.start(testConfig)
    Bugsnag.notify(new Error('123'), (event) => {
      return false
    }, (err, event) => {
      if (err) {
        done(err)
      }
      expect(typedGlobal.fetch).not.toHaveBeenCalled()
      done()
    })
  })

  it('indicates whether or not the client is started', () => {
    const Bugsnag = getBugsnag()
    expect(Bugsnag.isStarted()).toBe(false)
    Bugsnag.start(testConfig)
    expect(Bugsnag.isStarted()).toBe(true)
  })
})
