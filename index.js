import { onLoad, useLogger, mikser, createdHook, updatedHook, deletedHook, scheduleHook } from 'mikser-core'
import express from 'express'
import bodyParser from 'body-parser'

async function created(req, res, next) {
    try {
        if (req.body.id) {
            await createdHook(req.params.name, req.body)
        } else if (req.body.ids) {
            for(let id of req.body.ids) {
                await createdHook(req.params.name, { id })
            }
        }
        res.json({ success: true })
    } catch (err) {
        next(err)
    }
}

async function updated(req, res, next) {
    try {
        if (req.body.id) {
            await updatedHook(req.params.name, req.body)
        } else if (req.body.ids) {
            for(let id of req.body.ids) {
                await updatedHook(req.params.name, { id })
            }
        }
        res.json({ success: true })
    } catch (err) {
        next(err)
    }
}

async function deleted(req, res, next) {
    try {
        if (req.body.id) {
            await deletedHook(req.params.name, req.body)
        } else if (req.body.ids) {
            for(let id of req.body.ids) {
                await deletedHook(req.params.name, { id })
            }
        }
        res.json({ success: true })
    } catch (err) {
        next(err)
    }
}

async function schedule(req, res, next) {
    try {
        await scheduleHook(req.params.name, req.body)
        res.json({ success: true })
    } catch (err) {
        next(err)
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
    webhooks.post('/schedule/:name?', authorization, schedule)
    webhooks.post('/:name', authorization, created)
    webhooks.put('/:name', authorization, updated)
    webhooks.delete('/:name', authorization, deleted)

    app.use(bodyParser.json())
    
    if (!mikser.options.app) {
        app.use('/api/webhooks', webhooks)
        const { port } = mikser.config.webhooks || {}
        if (!port) {
            return logger.error('Web Hooks port config is missing.')
        }
        logger.info('Web Hooks listening on port: %d', port)
        app.listen(port)
    } else {
        app.use('/mikser/api/webhooks', webhooks)
    }
})