import { onLoad, useLogger, mikser, createdHook, updatedHook, deletedHook, triggerHook } from 'mikser-core'
import express from 'express'
import bodyParser from 'body-parser'

async function created(req, res) {
    try {
        await createdHook(req.params.name, req.body)
        res.json({ success: true })
    } catch (err) {
        res.json({ success: false, message: err.message })
    }
}

async function updated(req, res) {
    try {
        await updatedHook(req.params.name, req.body)
        res.json({ success: true })
    } catch (err) {
        res.json({ success: false, message: err.message })
    }
}

async function deleted(req, res) {
    try {
        await deletedHook(req.params.name, req.body)
        res.json({ success: true })
    } catch (err) {
        res.json({ success: false, message: err.message })
    }
}

async function trigger(req, res) {
    try {
        await triggerHook(req.body.uri, req.body)
        res.json({ success: true })
    } catch (err) {
        res.json({ success: false, message: err.message })
    }
}

async function authorization(req, res, next) {
    if (!mikser.config.webhooks?.token) next()
    else {
        const [bearer, token] = req.headers.authorization?.split(' ') 
        if (bearer != 'Bearer' || token != mikser.config.webhooks?.token) {
            res.set('WWW-Authenticate', 'Bearer realm="token"')
            res.status(401).send('Authorization token is missing or invalid.')
        }
    }
}

onLoad(async () => {
    if (mikser.options.watch !== true) return
    const logger = useLogger()

    let app = mikser.options.app || express()

    const webhooks = express()
    webhooks.post('/', authorization, trigger)
    webhooks.post('/:name', authorization, created)
    webhooks.put('/:name', authorization, updated)
    webhooks.delete('/:name', authorization, deleted)

    app.use(bodyParser.json())
    
    if (!mikser.options.app) {
        app.use('/mikser/webhooks', webhooks)
        const { port } = mikser.config.webhooks || {}
        if (!port) {
            return logger.error('Web Hooks port config is missing.')
        }
        logger.info('Web Hooks listening on port: %d', port)
        app.listen(port)
    } else {
        app.use('/mikser/webhooks', webhooks)
    }
})