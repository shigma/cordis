import { Context, Plugin } from '../src'
import { expect } from 'chai'
import { noop } from 'cosmokit'
import { event } from './shared'
import * as jest from 'jest-mock'

describe('Update', () => {
  it('update runtime', () => {
    const root = new Context()
    const dispose = jest.fn(noop)
    const callback = jest.fn<Plugin.Function>((ctx) => {
      ctx.on('dispose', dispose)
      ctx.on(event, () => {
        ctx.state.update({ value: 2 })
      })
      ctx.on('fork', noop)
    })

    root.plugin(callback, { value: 1 })
    expect(dispose.mock.calls).to.have.length(0)
    expect(callback.mock.calls).to.have.length(1)
    root.emit(event)
    expect(dispose.mock.calls).to.have.length(1)
    expect(callback.mock.calls).to.have.length(2)

    expect(callback.mock.calls[0][0]).to.equal(callback.mock.calls[1][0])
    expect(callback.mock.calls[0][1]).to.deep.equal({ value: 1 })
    expect(callback.mock.calls[1][1]).to.deep.equal({ value: 2 })
  })

  it('update fork (single)', () => {
    const root = new Context()
    const callback = jest.fn(config => {})
    const fork = root.plugin((ctx, config) => {
      ctx.on(event, () => callback(config))
    }, { value: 1 })

    root.emit(event)
    expect(callback.mock.calls).to.have.length(1)
    expect(callback.mock.calls[0][0]).to.deep.equal({ value: 1 })

    fork.update({ value: 2 })
    root.emit(event)
    expect(callback.mock.calls).to.have.length(2)
    expect(callback.mock.calls[1][0]).to.deep.equal({ value: 2 })
  })

  it('update fork (multiple)', () => {
    const root = new Context()
    const inner = jest.fn<Plugin.Function>()
    const outer = jest.fn<Plugin.Function>((ctx) => {
      ctx.on('fork', inner)
    })

    const fork1 = root.plugin(outer, { value: 1 })
    const fork2 = root.plugin(outer, { value: 0 })
    expect(inner.mock.calls).to.have.length(2)
    expect(outer.mock.calls).to.have.length(1)

    fork2.update({ value: 2 })
    expect(inner.mock.calls).to.have.length(3)
    expect(outer.mock.calls).to.have.length(1)
    expect(fork1.config).to.deep.equal({ value: 1 })
    expect(fork2.config).to.deep.equal({ value: 2 })
  })

  it('deferred update', () => {
    const root = new Context()
    const callback = jest.fn()
    const plugin = {
      using: ['foo'],
      reusable: true,
      apply: callback,
    }

    const fork = root.plugin(plugin, { value: 1 })
    expect(callback.mock.calls).to.have.length(0)

    fork.update({ value: 2 })
    expect(callback.mock.calls).to.have.length(0)

    root.foo = {}
    expect(callback.mock.calls).to.have.length(1)
    expect(callback.mock.calls[0][1]).to.deep.equal({ value: 2 })
    expect(fork.disposables).to.have.length(1)              // service listener
    expect(fork.runtime.disposables).to.have.length(1)      // fork

    fork.update({ value: 3 })
    expect(callback.mock.calls).to.have.length(2)
    expect(callback.mock.calls[1][1]).to.deep.equal({ value: 3 })
    expect(fork.disposables).to.have.length(1)              // service listener
    expect(fork.runtime.disposables).to.have.length(1)      // fork
  })
})
