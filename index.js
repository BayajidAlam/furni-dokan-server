const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
var jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET)

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

// verify client token and permit to process 
function verifyJWT(req,res,next){
  const authHeader = req.headers.authorization
  if(!authHeader){
    return res.status(403).send('unauthorize access')
  }

  const token = authHeader.split(' ')[1]

  jwt.verify(token,process.env.SECRET_TOKEN,function(err,decoded){
    if(err){
      return res.status(403).send({message:'forbidden access'})
    }
    req.decoded = decoded;
    next()
  })
}
 
// main function 
async function run(){

  try{
    
    // colletions 
    const categorysCollection = client.db('furniDokan').collection('categorys')
    const singleCategoryCollection = client.db('furniDokan').collection('singleCategory')
    const usersCollection = client.db('furniDokan').collection('users')
    const bookingsCollection = client.db('furniDokan').collection('bookings')
    const paymentsCollection = client.db('furniDokan').collection('payments')

    // payment 
    app.post('/create-payment-intent',async(req,res)=>{
      const payment = req.body 
      const price = payment.price
      const amount = price * 100 

      const paymentIntent = await stripe.paymentIntents.create({
        currency: 'usd',
        amount: amount,
        'payment_method_types':[
          'card'
        ]
      })
      res.send({
        clientSecret:paymentIntent.client_secret,
      })
    })

    // save payments to db 
    app.post('/payments',async(req,res)=>{
      const payment = req.body
      const result = await paymentsCollection.insertOne(payment)
      const id = payment.bookingId
      const filter = {_id:ObjectId(id)}
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId:payment.transactionId
        }
      }
      const updatedResult = await bookingsCollection.updateOne(filter,updatedDoc)
      res.send(result)
    })

    // generate jWt and send to client
    app.get('/jwt',async(req,res)=>{
      const email = req.query.email
      const query = { email : email }
      const result = await usersCollection.findOne(query)
      if(result){
        const token = jwt.sign({email},process.env.SECRET_TOKEN)
        return res.send({accessToken:token})
      }
      res.status(403).send({accessToken:'unauthorize access'})
    })

  
    // chcek user as a admin  
    app.get('/user/admin/:email',async(req,res)=>{
      const email = req.params.email 
      const query = { email } 
      const user = await usersCollection.findOne(query)
      res.send({isAdmin:user?.role === 'admin'})
    })

    // check seller 
    app.get('/user/seller/:email',async(req,res)=>{
      const email = req.params.email 
      const query = { email }
      const seller = await usersCollection.findOne(query)
      res.send({isSeller:seller?.role === 'seller'})
    })

    // check user
    app.get('/user/buyer/:email',async(req,res)=>{
      const email = req.params.email 
      const query = { email }
      const buyer = await usersCollection.findOne(query)
      res.send({isBuyer:buyer?.role === 'buyer'})
    })

    // get all categorys 
    app.get('/categorys',async(req,res)=>{
      const query = {}
      const categorys = await categorysCollection.find(query).toArray()
      res.send(categorys)
    })

    // get all data of a category
    app.get('/category',async(req,res)=>{
      const name = req.query.name
      const query = {catName:name}
      const data = await singleCategoryCollection.find(query).toArray()
      res.send(data)
    })

    // save a user to db 
    app.post('/user',async(req,res)=>{
      const user = req.body
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    // get a user from db 
    app.get('/user',async(req,res)=>{
      const email = req.query.email 
      const query = { email: email}
      const user = await usersCollection.find(query).toArray()
      res.send(user)
    })

    // get a user from db 
    app.get('/getUser',verifyJWT,async(req,res)=>{
      const userEmail = req.query.email
      console.log(userEmail);
      const query = {email:userEmail}
      const foundUser = await usersCollection.findOne(query)
      res.send(foundUser)
    })

    // delete a user 
    app.delete('/deleteuser',async(req,res)=>{
      const userEmail = req.query.email
      const query = {email: userEmail}
      const deleteResult = await usersCollection.deleteOne(query)
      res.send(deleteResult)
    })

    // load all sellers data 
    app.get('/allSellers',async(req,res)=>{
      const userRole = req.query.role 
      const query = {role:userRole}
      const result = await usersCollection.find(query).toArray()
      res.send(result)
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

  //  verify a seller 
  app.put('/updateSeller/:email',async(req,res)=>{
    const email = req.params.email 
    const filter = {email:email}
    const options = {upsert:true}
    const recevedDoc = req.body
    const updateDoc = {
      $set: {
        sellerState : recevedDoc.sellerState
      }
    }
    const result = await singleCategoryCollection.updateOne(filter,updateDoc,options)
    res.send(result)
  })

  //  change user state as a seller 
  app.put('/updateUser/:email',async(req,res)=>{
    const email = req.params.email 
    const filter = {email:email}
    const options = {upsert:true}
    const recevedDoc = req.body
    const updateDoc = {
      $set: {
        sellerState : recevedDoc.sellerState
      }
    }
    const result = await usersCollection.updateOne(filter,updateDoc,options)
    res.send(result)
  })

  // report a seller 
  app.put('/report/:id',async(req,res)=>{
    const id = req.params.id
    const filter = {_id:ObjectId(id)}
    const recevedDoc = req.body;
    const options = {upsert:true}
    if(recevedDoc.productReportState === 'not reported'){
      const updatedDoc = {
        $set: {
          reportState: 'reported'
        }
      }
    const result = await singleCategoryCollection.updateOne(filter,updatedDoc,options)
    res.send(result)
    console.log(result);
    } 
  })

  // get all reported item 
  app.get('/reported',async(req,res)=>{
    const query = {
      reportState: 'reported'
    }
    const reportItem = await singleCategoryCollection.find(query).toArray()
    res.send(reportItem)
  })

  // delete a reported item 
  app.delete('/reported/:id',async(req,res)=>{
    const id = req.params.id 
    const query = { _id:ObjectId(id)}
    const result = await singleCategoryCollection.deleteOne(query)
    res.send(result)
    console.log(result)
  })

   // set as Booked
  app.put('/setbooked/:id',async(req,res)=>{
     const id = req.params.id 
     const body = req.body
     const filter = {_id:ObjectId(id)}
     const options = { upsert: true } 
     const updatedDoc = {
        $set: {
          salesStatus:body.salesStatus
        }
     }
     const result = await singleCategoryCollection.updateOne(filter,updatedDoc,options)
     res.send(result)
  })

  // update a product to advertise 
   app.put('/advertisement/:id',async(req,res)=>{
    const id = req.params.id 
    const filter = {_id:ObjectId(id)}
    const options = {upsert: true}
    const recevedDoc = req.body
    const updatedDoc = {
      $set: {
        addState: recevedDoc.state
      }
    }
    const result = await singleCategoryCollection.updateOne(filter,updatedDoc,options)
    res.send(result)
   })

  //  get all advertisemet data 
  app.get('/advertisement',async(req,res)=>{
    const query = { addState : 'advertised'}
    const result = await singleCategoryCollection.find(query).toArray()
    res.send(result)
  })

  // get all buyer from db 
  app.get('/buyers',async(req,res)=>{
    const email = req.query.email 
    const query = {
      sellerEmail: email
    }
    const buyers = await bookingsCollection.find(query).toArray()
    res.send(buyers)
  })

  // get all of my order 
  app.get('/orders',async(req,res)=>{
    const email = req.query.email 
    const query = {
      buyerEmail : email
    }
    const orders = await bookingsCollection.find(query).toArray()
    res.send(orders)
  })

  }
  finally{
   
  }
}
run().catch(err=>console.log(err))
app.listen(port, () => {
  console.log(`app is listening on port ${port}`);
});
