/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

class WatchShop extends Contract {

    async InitLedger(ctx) {
        const watches = [
            {
                ID: 'watch1',
                Manufacturer: 'Titan',
                Model : 'Titan1',
                BeltColor: 'Black',
                Owner: 'Seller',
                Price: 10000,
            },
            {
                ID: 'watch2',
                Manufacturer: 'Rolex',
                Model : 'Rolex1',
                BeltColor: 'Silver',
                Owner: 'Seller',
                Price: 15000,
            },
            {
                ID: 'watch3',
                Manufacturer: 'Omega',
                Model : 'Omega1',
                BeltColor: 'Red',
                Owner: 'Seller',
                Price: 12000,
            },
            {
                ID: 'watch4',
                Manufacturer: 'Rolex',
                Model : 'Rolex2',
                BeltColor: 'Black',
                Owner: 'Seller',
                Price: 18000,
            },
            {
                ID: 'watch5',
                Manufacturer: 'Omega',
                Model : 'Omega2',
                BeltColor: 'silver',
                Owner: 'Seller',
                Price: 15000,
            },
        ];

        for (const watch of watches) {
            await ctx.stub.putState(watch.ID, Buffer.from(stringify(sortKeysRecursive(watch))));
        }
    }

    // CreateAsset issues a new asset to the world state with given details.
    async AddWatch(ctx, id, manufacturer, model, belt_color, price) {
        const exists = await this.WatchExists(ctx, id);
        if (exists) {
            throw new Error(`The watch ${id} already exists`);
        }

        const watch = {
            ID: id,
            Manufacturer: manufacturer,
            Model : model,
            BeltColor: belt_color,
            Owner: 'Seller',
            Price: parseInt(price),
        };
       
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(watch))));
        return JSON.stringify(watch);
    }

    async ReadWatch(ctx, id) {
        const watchJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!watchJSON || watchJSON.length === 0) {
            throw new Error(`The watch ${id} does not exist`);
        }
        return watchJSON.toString();
    }

    async UpdatePrice(ctx, id,new_price) {
        const watchString = await this.ReadWatch(ctx, id);
        const watch = JSON.parse(watchString);
        watch.Price = parseInt(new_price);
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(watch))));
        return JSON.stringify(watch);
    }

    // DeleteAsset deletes an given asset from the world state.
    async DeleteWatch(ctx, id) {
        const exists = await this.WatchExists(ctx, id);
        if (!exists) {
            throw new Error(`The watch ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    // AssetExists returns true when asset with given ID exists in world state.
    async WatchExists(ctx, id) {
        const watchJSON = await ctx.stub.getState(id);
        return watchJSON && watchJSON.length > 0;
    }

    // TransferAsset updates the owner field of asset with given id in the world state.
    async BuyWatch(ctx, id, newOwner) {
        const watchString = await this.ReadWatch(ctx, id);
        const watch = JSON.parse(watchString);
        watch.Owner = newOwner;
        
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(watch))));
        return JSON.stringify(watch);
    }
    
    async History(ctx, key) {
        const promiseOfIterator = ctx.stub.getHistoryForKey(key);

        const results = [];
        for await (const keyMod of promiseOfIterator) {
            const resp = {
                timestamp: keyMod.timestamp,
                txid: keyMod.txId
            }
            if (keyMod.isDelete) {
                resp.data = 'KEY DELETED';
            } else {
                resp.data = keyMod.value.toString('utf8');
            }
            results.push(resp);
        }
        return results;
    }
    

    // GetAllAssets returns all assets found in the world state.
    async GetAllWatch(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
}

module.exports = WatchShop;
