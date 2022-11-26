const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@myclaster-1.wxhqp81.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run(){

  try{
    
    // colletions 
    const categorysCollection = client.db('furniDokan').collection('categorys')
    const singleCategoryCollection = client.db('furniDokan').collection('singleCategory')
    const usersCollection = client.db('furniDokan').collection('users')
    const bookingsCollection = client.db('furniDokan').collection('bookings')

    // get all categorys 
    app.get('/categorys',async(req,res)=>{
      const query = {}
      const categorys = await categorysCollection.find(query).toArray()
      res.send(categorys)
    })

    // get all data of a query 
    app.get('/category',async(req,res)=>{
      const name = req.query.name
      const query = {catName:name}
      console.log(name)
      const data = await singleCategoryCollection.find(query).toArray()
      res.send(data)
    })

    // save a user to db 
    app.post('/user',async(req,res)=>{
      const user = req.body
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    // load all sellers data 
    app.get('/allSellers',async(req,res)=>{
      const userRole = req.query.role 
      const query = {role:userRole}
      const result = await usersCollection.find(query).toArray()
      res.send(result)
    })

    // delete a user 
    app.delete('/deleteuser',async(req,res)=>{
      const userEmail = req.query.email
      const query = {email: userEmail}
      const deleteResult = await usersCollection.deleteOne(query)
      res.send(deleteResult)
    })

    // get all buyer 
    app.get('/allbuyers',async(req,res)=>{
      const userRole = req.query.role 
      const query = {role: userRole}
      const result = await usersCollection.find(query).toArray()
      res.send(result)
    })

    // post a product to singleCategory 
    app.post('/category',async(req,res)=>{
      const newProduct = req.body
      const result = await singleCategoryCollection.insertOne(newProduct)
      console.log(result)
      res.send(result)
    })
    // get all product for a email 
    app.get('/myProdcuts',async(req,res)=>{
      const userEmail = req.query.email 
      const query = {email:userEmail}
      const result = await singleCategoryCollection.find(query).toArray()
      res.send(result)
    })

   // delete a product 
   app.delete('/deleteProduct',async(req,res)=>{
    const id = req.query.id
    const query = {_id:ObjectId(id)}
    const result = await singleCategoryCollection.deleteOne(query)
    res.send(result)
   })

  //  sava a booking to db 
   app.post('/booking',async(req,res)=>{
    const booking = req.body
    const result = await bookingsCollection.insertOne(booking)
    res.send(result)
   })

  }
  finally{
   
  }
}
run().catch(err=>console.log(err))
app.listen(port, () => {
  console.log(`app is listening on port ${port}`);
});
