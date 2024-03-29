/* 
    -- -- -- -- -- -- -- -- Welcome to splitwise -- -- -- -- -- -- -- -- -- --
    **************************************************************************


    This app is done by using NodeJS, Express,
    Anush kumar N © 2020
    github: https://github.com/Anushkumar06 (or) https://github.com/anush6989
    website: https://aksite-629.netlify.com

    
    **************************************************************************
    -- -- -- -- -- -- -- -- --  THANK YOU  -- -- -- -- -- -- -- -- -- -- -- --
*/

//All imports and application configuration
const express = require('express');
const { Client } = require('pg');
const cors = require('cors')
const connectionString = 'postgres://anush:anush@localhost:5432/test';
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
const client = new Client({
    connectionString: connectionString
});
client.connect();
var app = express();
app.use(cors());
const bodyParser = require('body-parser'); 
app.use(bodyParser.json());
app.set('port', process.env.PORT || 4000);

//Global variables
var userCredentialsObj = [];
var token = ""
var privateKey = "login-app";
const saltRounds = 10;

// const decoded = jwt.decode(token);
// console.log('token:', token);
// console.log('decoded:', decoded);
// console.log('exp:', new Date(decoded.exp * 1000));
// console.log('iat:', new Date(decoded.iat * 1000));

//experimental purpose.
app.get('/', function (req, res, next) {
    client.query('SELECT * FROM users',function (err, result) {
        if (err) {
            console.log(err);
            res.status(400).send(err);
        }
        res.status(200).send(result.rows);
    });
});

//post call for signup
//hash the password for the current user
function hashUserCredentials(userCredentials){
    for(var i in userCredentials){
        if(i == 2){
            // console.log(userCredentials[i])
            var hash = bcrypt.hashSync(userCredentials[i], saltRounds);
            userCredentialsObj.push(hash)
        }
        else{
            userCredentialsObj.push(userCredentials[i])
        }
        // console.log(i)
    }
    // console.log(userCredentialsObj)
    userCredentialsObj.push("active")
    userCredentialsObj.push("false")
    userCredentialsObj.push("false")
}
//handle post call for sign up
app.post('/post-call', function(req, res) {
    var userCredentials = req.body;
    hashUserCredentials(userCredentials)
    const queries ={
        text: 'INSERT INTO users (name,email,password,mobile_number,status,is_email_verified,is_phone_verified) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        values: userCredentialsObj
    };
    client.query(queries, function (err, result) {
        if (err) {console.log(err);res.status(400).send(err);}
        res.status(200).send("user added: "+result.rows);
    }); 
});

//post call for login
//authentication by generating jwt
function authenticationCheck(userDetails,resultUsers,resultArr){
    var message = "";
    try{
        if(bcrypt.compareSync(userDetails[1],resultUsers.password) === true){
            // console.log("Login sucessfull.")
            message+=""
            message+="login success";
            token = jwt.sign({exp: Math.floor(Date.now() / 1000) + (60*60), userData: resultUsers.name }, privateKey)}
        else{
            // console.log("Login failed.")
            message+=""
            message+="Password incorrect";
        }
    }
    catch(err){
        // console.log("Username & Password does not match.")
        message+=""
        message+="Email & Password does not match or account does not exist.";
    }
    resultArr.push(message);resultArr.push(token)
}
//login authentication for the current login user
function loginAuthentication(userDetails,resultArr,result){
    var resultUsers;
    try{
        resultUsers = result.rows[0];
    }
    catch(err){console.log("jwt not arrived at login")}
    // console.log(userDetails[0]+", "+ resultUsers.email +", "+ resultUsers.password+", "+ hashPassword)
    authenticationCheck(userDetails,resultUsers,resultArr)
}
//handle post call for login 
app.post('/post-call-login',function(req,res){
    var userDetails = req.body;
    var resultArr =[];
    // console.log(userDetails)
    const queries ={name:"fetch-user",text: 'SELECT * FROM users WHERE email = $1',values: [userDetails[0]]};
    client.query(queries,function (err, result) {
        if (err) {
            console.log("error");
            res.status(400).send("err");
        }
        loginAuthentication(userDetails,resultArr,result);
        res.status(200).send(resultArr);
    });
})


//add expense via modal box - to be modified
app.post('/add-expense',async function(req,res){
    var date = new Date();
    // console.log(date.toString().substr(0,32))
    const userData = req.body;
    // for(let i in userData){
    //     console.log(userData[i])
    // }
    var userQuery = await client.query('SELECT * FROM users WHERE email = $1',[userData[0]])
    // console.log("user data ",userQuery.rows)
    // console.log("user data ",userQuery.rows)
    if(userQuery.rows.length == 0){
        // console.log("user empty")
        var insertNewUser = await client.query('INSERT INTO users (name,email,status,is_email_verified,is_phone_verified) VALUES ($1,$2,$3,$4,$5)',[userData[0],userData[0],"pending","false","false"])
        var getNewUser = await client.query('SELECT * FROM users WHERE email = $1',[userData[0]])

        var insertIntoPayments = await client.query('INSERT INTO payments (user_id,owe_id,amount,created_at,description) VALUES ($1,$2,$3,$4,$5)',[userData[3],getNewUser.rows[0].id,userData[2],date.toString().substr(0,32),userData[1]])
        // console.log(getNewUser.rows)
        res.status(200).send("insert payment done")
    }
    else{
        // console.log("non query result",userQuery.rows)
        var insertIntoPayments = await client.query('INSERT INTO payments (user_id,owe_id,amount,created_at,description) VALUES ($1,$2,$3,$4,$5)',[userData[3],userQuery.rows[0].id,userData[2],date.toString().substr(0,32),userData[1]])
        // console.log("second query result: ",insertIntoPayments)
        res.status(200).send("insert payment done")
    }
});


//check login
function checkLoginToQuitSession(decoded,res){
    if(decoded == "jwt expired"){
        var arr = []
        arr.push(decoded);arr.push([{id:"",name:""}])
        res.status(200).send(arr)
    }
    else{
        const queries ={text: 'SELECT * FROM users WHERE name = $1', values: [decoded]};
        // console.log(queries)
        client.query(queries,function(err,result){
            var arr = []
            if (err) {console.log(err);res.status(400).send(err);}
            arr.push("sucess");arr.push(result.rows)
            // console.log(arr[1])
            res.status(200).send(arr)
        })
    }
}
//handle post call to end session or continoue
app.post('/check-login',async function(req,res){
    var token = req.body;
    // console.log("Token data: "+token.data)
    try{
        var decoded = await jwt.verify(token.data, privateKey,function(err,decode){
            if(err){// console.log(err.message)
                return err.message
            }// console.log("user data "+decode.userData)
            return decode.userData;
        });
        // console.log(decoded)
        // res.status(200).send(decoded.userData);
        checkLoginToQuitSession(decoded,res);        
    }
    catch(err){
        var arr= []
        var user={id:"", name:""}
        // console.log("try catch err "+err.message)
        arr.push(err.message);arr.push([user]);
        res.status(200).send(arr);
    }
})


//show expense in dashboard
//paid by current user to other user retrival
function addPaymentUsers(totalPaymentsQuery,totalUsersQuery,arr){
    var arrAssociative ={}
    totalPaymentsQuery.rows.map(item=>{
        for(let i in totalUsersQuery.rows){
            if(item.owe_id == totalUsersQuery.rows[i].id){
                arrAssociative={
                    name:totalUsersQuery.rows[i].name,
                    description:item.description,
                    amount:item.amount,
                    time:item.created_at
                }
                arr.push(arrAssociative)
            }
        }
    })
}
//others paid to current user retrival
function addDueUsers(totalDueQuery,totalUsersQuery,arr2){
    var arrAssociative ={}
    totalDueQuery.rows.map(items=>{
        for(let i in totalUsersQuery.rows){
            if(items.user_id == totalUsersQuery.rows[i].id){
                arrAssociative={
                    name:totalUsersQuery.rows[i].name,
                    description:items.description,
                    amount:items.amount,
                    time:items.created_at
                }
                arr2.push(arrAssociative)
            }
        }
    })
}
//get expense
async function getExpense(arr,arr2,decoded,res){
    var currentUserQuery = await client.query('SELECT id FROM users WHERE name = $1',[decoded]);
    var totalUsersQuery = await client.query('SELECT id,name FROM users');
    var totalPaymentsQuery = await client.query("SELECT * FROM payments WHERE user_id = $1",[currentUserQuery.rows[0].id])
    var totalDueQuery = await client.query("SELECT * FROM payments WHERE owe_id = $1",[currentUserQuery.rows[0].id])
    // console.log("due query: ",totalDueQuery.rows)
    // console.log("outcome: ",totalPaymentsQuery.rows)
    // console.log("outcome: ",totalUsersQuery.rows)
    addPaymentUsers(totalPaymentsQuery,totalUsersQuery,arr)
    addDueUsers(totalDueQuery,totalUsersQuery,arr2)
    res.status(200).send([arr,arr2])
}
//handle post call expense view
app.post('/expense-view',async function(req,res){
    var token = req.body;
    try{
        var decoded = await jwt.verify(token.data, privateKey,function(err,decode){
            if(err){
                // console.log(err.message)
                return err.message
            }
            // console.log("user data "+decode.userData)
            return decode.userData;
        });
        // console.log(decoded)
        // res.status(200).send(decoded.userData);
    }
    catch(err){console.log(err)}
    var arr = []
    var arr2 = []
    getExpense(arr,arr2,decoded,res)
    // console.log(arr2)
})

app.listen(4000, function () {
    console.log('Server is running.. on Port 4000');
});
