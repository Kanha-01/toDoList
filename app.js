// jshint esversion : 6
const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const date = require(__dirname + '/date');
const mongoose = require("mongoose");
const _ = require("lodash");
require("dotenv").config();

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI);

const itemsSchema = {
    name: {
        type: String,
        trim: true,
        required: true,
    },
    completed: {              // ✅ add this
        type: Boolean,
        default: false
    }
};

const Item = mongoose.model("Item", itemsSchema);
const item1 = new Item({
    name: "welcome to To DO list",
    completed : "false"
})
const item2 = new Item({
    name: "click + to add new item",
    completed : "false"
})
const item3 = new Item({
    name: "<-- check here to mark done",
    completed : "false"
})

const listSchema = {
    name: String,
    items: [itemsSchema]
}
const List = mongoose.model("List", listSchema);

app.get('/', async function (req, res) {
    try {
        const foundItems = await Item.find({});
        if (foundItems.length === 0) {
            await Item.insertMany([item1, item2, item3]);   // ✅ wait
            return res.redirect('/');                       // ✅ then redirect
        }
        res.render("list", { listType: date.getDate(), newItems: foundItems });
    }
    catch (err) { console.log("error " + err); }
});

// app.get('/', async function (req, res) {
//     Item.find({})
//         .then((foundItems) => {
//             if (foundItems.length === 0) {
//                 Item.insertMany([item1, item2, item3])
//                     .then(() => console.log("successfully inserted the defaults"))
//                     .catch((err) => console.log("error" + err));
//                 res.redirect('/');
//             }
//             else {
//                 res.render("list", { listType: date.getDate(), newItems: foundItems })
//             }
//         })
//         .catch((err) => console.log("error" + err));
// });

app.post('/', function (req, res) {
    console.log(req.body);
    const listType = req.body.listType;
    const newItem = req.body.newInput;
    if (listType === date.getDate()) {
        const item = new Item({
            name: newItem
        })
        item.save()
        res.redirect('/');
    }
    else {
        List.findOneAndUpdate({ name: listType }, { $push: { items: { name: newItem } } })
            .then(() => res.redirect('/' + listType))
            .catch(err => console.error(err))
    }
});

app.post('/delete', function (req, res) {
    const itemId = req.body.id;
    const listName = req.body.listType;   // passed from form hidden input

    if (listName === date.getDate()) {
        // Delete from Item collection
        Item.findByIdAndDelete(itemId)
            .then(() => res.redirect("/"))
            .catch(err => console.log("Error deleting item: " + err));
    } else {
        // Delete from embedded items in List
        List.findOneAndUpdate(
            { name: listName },
            { $pull: { items: { _id: itemId } } }
        )
            .then(() => res.redirect("/" + listName))
            .catch(err => console.log("Error deleting from list: " + err));
    }
});

app.post("/toggle", async function (req, res) {
    const itemId = req.body.id;
    const listName = req.body.listType;
    const isCompleted = req.body.completed === "on"; // "on" if checked, undefined if unchecked

    try {
        if (listName === date.getDate()) {
            // For default list
            await Item.findByIdAndUpdate(itemId, { completed: isCompleted });
            res.redirect("/");
        } else {
            // For custom lists
            const list = await List.findOne({ name: listName });
            const item = list.items.id(itemId);

            if (item) {
                item.completed = isCompleted;
                await list.save();
            }
            res.redirect("/" + listName);
        }
    } catch (err) {
        console.error(err);
        res.redirect("/");
    }
});


app.get('/about', function (req, res) {
    res.render("about")
});

app.get("/favicon.ico", (req, res) => res.status(204).end());

app.get("/:customListName", async function (req, res) {
    try {
        const customListName = _.capitalize(req.params.customListName);

        let foundList = await List.findOne({ name: customListName });
        if (!foundList) {
            const list = new List({
                name: customListName,
                items: [item1, item2, item3]
            });
            await list.save();                              // ✅ wait
            return res.redirect("/" + customListName);      // ✅ then redirect
        }

        res.render("list", { listType: foundList.name, newItems: foundList.items });
    }
    catch (err) {
        console.error("Error : " + err);
    }
});

// app.get("/:customListName", function (req, res) {
//     const customListName = _.capitalize(req.params.customListName);

//     List.findOne({ name: customListName })
//         .then(foundList => {
//             if (!foundList) {
//                 //create a new list
//                 const list = new List({
//                     name: customListName,
//                     items: [item1, item2, item3]
//                 })
//                 list.save();
//                 res.redirect("/" + customListName);
//             }
//             else {
//                 res.render("list", { listType: foundList.name, newItems: foundList.items })
//             }
//         })
//         .catch(err => console.error("Error : " + err));
// });

app.listen(process.env.PORT || 3000, function () {
    console.log("server is running at port 3000");
});