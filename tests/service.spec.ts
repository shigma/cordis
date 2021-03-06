import { Context, Service } from '../src'
import { noop } from 'cosmokit'
import { expect } from 'chai'
import * as jest from 'jest-mock'
import './shared'

describe('Service', () => {
  it('normal service', async () => {
    class Foo extends Service {
      constructor(ctx: Context) {
        super(ctx, 'foo')
      }
    }

    const root = new Context()
    root.plugin(Foo)
    expect(root.foo).to.be.undefined

    await root.start()
    expect(root.foo).to.be.instanceOf(Foo)

    root.dispose(Foo)
    expect(root.foo).to.be.undefined
  })

  it('immediate service', async () => {
    class Foo extends Service {
      constructor(ctx: Context) {
        super(ctx, 'foo', true)
      }
    }

    const root = new Context()
    const callback = jest.fn(noop)
    root.on('internal/service', callback)

    root.plugin(Foo)
    expect(root.foo).to.be.instanceOf(Foo)
    expect(callback.mock.calls).to.have.length(1)

    await root.start()
    expect(callback.mock.calls).to.have.length(1)
  })

  it('service caller', async () => {
    class Foo extends Service {
      constructor(ctx: Context) {
        super(ctx, 'foo', true)
      }
    }

    const root = new Context()
    root.plugin(Foo)
    expect(root.foo.caller).to.equal(root)

    const ctx = root.extend()
    expect(ctx.foo.caller).to.equal(ctx)
  })

  it('dependency update', async () => {
    const callback = jest.fn()
    const dispose = jest.fn(noop)

    const root = new Context()
    root.using(['foo'], (ctx) => {
      callback(ctx.foo.bar)
      ctx.on('dispose', dispose)
    })

    expect(callback.mock.calls).to.have.length(0)
    expect(dispose.mock.calls).to.have.length(0)

    const old = root.foo = { bar: 100 }
    expect(callback.mock.calls).to.have.length(1)
    expect(callback.mock.calls[0][0]).to.equal(100)
    expect(dispose.mock.calls).to.have.length(0)

    // do not trigger event if reference has not changed
    old.bar = 200
    root.foo = old
    expect(callback.mock.calls).to.have.length(1)
    expect(dispose.mock.calls).to.have.length(0)

    root.foo = { bar: 300 }
    expect(callback.mock.calls).to.have.length(2)
    expect(callback.mock.calls[1][0]).to.equal(300)
    expect(dispose.mock.calls).to.have.length(1)

    root.foo = null
    expect(callback.mock.calls).to.have.length(2)
    expect(dispose.mock.calls).to.have.length(2)
  })

  it('lifecycle methods', async () => {
    const start = jest.fn(noop)
    const stop = jest.fn(noop)
    const fork = jest.fn(noop)

    class Foo extends Service {
      constructor(ctx: Context) {
        super(ctx, 'foo')
      }

      start = start
      stop = stop
      fork = fork
    }

    const root = new Context()
    root.plugin(Foo)
    expect(start.mock.calls).to.have.length(0)
    expect(stop.mock.calls).to.have.length(0)
    expect(fork.mock.calls).to.have.length(1)

    await root.start()
    expect(start.mock.calls).to.have.length(1)
    expect(stop.mock.calls).to.have.length(0)
    expect(fork.mock.calls).to.have.length(1)

    root.plugin(Foo)
    expect(start.mock.calls).to.have.length(1)
    expect(stop.mock.calls).to.have.length(0)
    expect(fork.mock.calls).to.have.length(2)

    root.dispose(Foo)
    expect(start.mock.calls).to.have.length(1)
    expect(stop.mock.calls).to.have.length(1)
    expect(fork.mock.calls).to.have.length(2)
  })
})
