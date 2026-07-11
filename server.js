const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'Vending_machine.json');
const PORT = 3000;

function loadDataFromFile() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            const parsed = JSON.parse(data);
            
            if (parsed.slots && Array.isArray(parsed.slots)) {
                console.log('Data is loaded');
                return parsed;
            }
        }
    } catch (error) {
        console.error('Error', error.message);
    }

    const emptyDB = {
        temperature: 20,
        credit: 0,
        revenue: 0,
        isBroken: false,
        slots: []
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(emptyDB, null, 2), 'utf8');
    
    return emptyDB;
}

function saveDataToFile() {
    try { 
        fs.writeFileSync(DATA_FILE, JSON.stringify(VendingMachine, null, 2), 'utf8');
        console.log('Data has been loaded');
    } catch (error) {
        console.error('Can`t save');
    }
}

function getStatus() {
    if (VendingMachine.isBroken) return 'broken';
    else if (VendingMachine.temperature > 100) {
        VendingMachine.isBroken = true;
        return 'broken';
    }
    else if (VendingMachine.temperature > 80) return 'overheated';
    return 'operational';
}

function checkNotBroken() {
    const status = getStatus();
    if (status === 'broken') {
        throw new Error('Vending Machine is broken and cannot function')
    }
}

function findSlot(slotId) {
    const slot = VendingMachine.slots.find(s => s.id === slotId);
    if (!slot) {
        throw new Error(`Cannot find slot with ID ${slotId}`);
    }
    return slot;
}

// === AutoCheck ===

let autoTickInterval = null;

function performAutoTick () {
    if (VendingMachine.isBroken) {
        stopAutoTick();
        return;
    }

    VendingMachine.temperature += 3;

    VendingMachine.slots.forEach(slot => {
        slot.freshness = Math.max(0, slot.freshness - 1);
    });

    if (VendingMachine.temperature > 100) {
        VendingMachine.isBroken = true;
        stopAutoTick();
        console.log('Vending Machine is broken and cannot function')
    }
}

function startAutoTick() {
    if (autoTickInterval) {
        clearInterval(autoTickInterval);
    }
    autoTickInterval = setInterval(performAutoTick, 60000);
}

function stopAutoTick() {
    if(autoTickInterval) {
        clearInterval(autoTickInterval);
        autoTickInterval = null;
    }
}



// === API ENDPOINTS === 

const allowedMethods = {
    '/machine': ['GET'],
    '/machine/restock': ['POST'],
    '/machine/insert': ['POST'],
    '/machine/select': ['POST'],
    '/machine/maintain': ['POST']
};

app.use((req, res, next) => {
    const pathname = req.path;
    const method = req.method;
    
    if (allowedMethods[pathname]) {
        if (!allowedMethods[pathname].includes(method)) {
            return res.status(405).json({
                error: `Method ${method} not allowed for ${pathname}`,
                allowedMethods: allowedMethods[pathname]
            });
        }
    }
    
    next();
});

app.get('/machine', (req, res) => {
    try {
        const status = getStatus();
        res.json({
            temperature: VendingMachine.temperature,
            credit: VendingMachine.credit,
            revenue: VendingMachine.revenue,
            slots: VendingMachine.slots,
            status: status
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/machine/restock', (req, res) => {
    try {
        const {id, product, price, stock } = req.body;

        if (id === undefined || !product || price === undefined || stock === undefined) {
            return res.status(400).json({
                error: 'Required field: id, product, price, stock'
            });
        }

        if (typeof id !== 'number' || typeof price != 'number' || typeof stock !== 'number') {
            return res.status(400).json({
                error: 'Invalid field: id, price or stock '
            });    
        }

        if (price < 0 || stock < 0) {
            return res.status(400).json({
                error: 'Invalid price or stock'
            });
        }

        checkNotBroken();

        const existingSlot = VendingMachine.slots.find(s => s.id === id);

        if (existingSlot) {
            existingSlot.product = product;
            existingSlot.price = price;
            existingSlot.stock = stock;
            existingSlot.freshness = 100;
            
            
        } else {
            VendingMachine.slots.push({
                id,
                product,
                price,
                stock,
                freshness: 100
            })
        }

        res.json({
            message: 'Slot has been updated',
            slot: existingSlot || VendingMachine.slots[VendingMachine.slots.length - 1]
        })

    } catch(error) {
        const status = error.message.includes('broken') ? 409 : 400;
        res.status(status).json({ error: error.message });
    }
});

app.post('/machine/insert', (req, res) => {
    try {
        const { amount } = req.body;
        
        if (amount === undefined) {
            return res.status(400).json({ error: 'Required field: amount'});
        }

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: 'amount must be positive'});
        }

        checkNotBroken();

        VendingMachine.credit += amount;

        res.json({
            message: `Add ${amount} credits`,
            credit: VendingMachine.credit
        });
    } catch (error) {
        const status = error.message.includes('broken') ? 409 : 400;
        res.status(status).json({ error: error.message});
    }
});

app.post('/machine/select', (req, res) => {

    try {
        const { slotId } = req.body;

        if (slotId === undefined) { 
            return res.status(400).json({ error: 'Required field: slotId'})
        }

        if (typeof slotId !== 'number' || slotId <= 0) {
            return res.status(400).json({ error: 'slotId mast be positive'})
        }

        checkNotBroken();

        const slot = findSlot(slotId)
        
        if(slot.stock <= 0) {
            return res.status(409).json({ error: 'The item is out of stock'})
        }

        if(slot.freshness <= 0) {
            return res.status(409).json({ error: 'The item is spoiled'})
        }

        if(VendingMachine.credit < slot.price) {
            return res.status(400).json({ error: `Insufficient funds. ${VendingMachine.credit} deposited. ${slot.price - VendingMachine.credit} needs to be added.`})
        }

        VendingMachine.credit -= slot.price;
        VendingMachine.revenue += slot.price;
        slot.stock -= 1;

        res.json({
            message: 'Successfully purchased',
            product: slot.product,
            price: slot.price,
            creditRemaining: VendingMachine.credit,
        })     

    } catch (error) {
        const status = error.message.includes('broken') ? 409 : 
                       error.message.includes('cannot find') ? 404 : 400;
        res.status(status).json({ error: error.message });
    }
});

app.post('/machine/maintain', (req, res) => {
    try {
        const status = getStatus();

        if (status === 'broken') {
            return res.status(409).json({ error: 'Vending machine is broken. Maintenance cannot be perfomed'});
        }
        
        VendingMachine.temperature = Math.max(0, VendingMachine.temperature - 30);
        const newStatus = getStatus();

        res.json({
            message: 'Maintenance completed',
            temperature: VendingMachine.temperature,
            status: newStatus
        });


    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


//ЗАПУСК

const VendingMachine = loadDataFromFile();

if(VendingMachine && VendingMachine.slots) {
    startAutoTick();
} else {
    console.log('Failed to initialize Vending Machine');
}

const server = app.listen(PORT);

process.on('SIGINT', () => {
    saveDataToFile();
    stopAutoTick();
    process.exit(0);
})

process.on('SIGTERM', () => {
    saveDataToFile();
    stopAutoTick();
    process.exit(0);
})

process.on('uncaughtException', (error) => {
    console.error('Unpredicted:', error);
    saveDataToFile();
    stopAutoTick();
    process.exit(1);
});

server.on('close', () => {
    saveDataToFile();
})