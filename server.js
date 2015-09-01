var http = require('http');
var mysql = require('mysql');
var qs = require('querystring')
var fs = require('fs');
var conn = require('../db/connection.json');

var datosRecibidos;
var query='';
var dataResult;

var orders_queue = [];

var pool = mysql.createPool({
  connectionLimit :   100,
  host :              conn.host,
  user :              conn.user,
  password :          conn.pass,
  database :          conn.database,
  debug :             false
});

function currentDate(){
  var d = new Date();
  d.setHours(d.getHours()-5);
  return d;
}

function writeLog(message){
  console.log('['+currentDate()+'] '+message);
  var stream = fs.createWriteStream('./debug/access.log',{flags:'a'});
  stream.once('open',function(fd){
    stream.write('['+currentDate()+'] '+message);
    stream.write('\n');
  });
}

function handleDB(q){
  pool.getConnection(function(err,connection){
    if(err){
      connection.release();
      writeLog(err.message);
      return;
    }
    writeLog('Connected to DB as id: '+connection.threadId);
    connection.query(q,function(err,rows){
      connection.release();
      if(!err){
        if(rows.length > 0){
          var stringRows = [];
          for (var i=0;i<rows.length;i++){
            stringRows[i] = String(rows[i].id);
          }
          writeLog('Data query and printed successfully!');
        }
        else{
          writeLog('Data query and inserted successfully!');
        }
      }
      else writeLog(err.message);
    });
    connection.on('error', function(err) {      
      connection.release();
      writeLog(err.message);
      return;
    });
  });
}

http.createServer(function(req,res){
  switch(req.url){
    
    case '/':
      writeLog('[INFO] Hand-seted parameters.');
      res.writeHead(200,'OK',{'Content-Type':'text/html'});
      res.write('<html><head><title>Hello cerebroU!</title><head><body>');
      res.write('<form action="/getdata" method="post">');
      res.write('Device ID: <input type="text" name="dev_id" value=""/><br/>');
      res.write('a: <input type="text" name="a" value=""/><br/>');
      res.write('b: <input type="text" name="b" value=""/><br/>');
      res.write('c: <input type="text" name="c" value=""/><br/>');
      res.write('<input type="submit"/>');
      res.write('</form></body></html>');
      res.end();
    break;
    /*
    case '/getdata':
      if(req.method=='POST'){
        req.on('data',function(chunk){
          datosLectura = qs.parse(String(chunk));
          writeLog('Recieved data');
        });
        req.on('end',function(){
          //writeLog(query);
          writeLog(String(datosLectura.dev_id));
          if(String(datosLectura.dev_id[0])=="S"){
            handleDB(req,res,'INSERT INTO cerebrou_lecturas (id_dev,a,b,c,datetime) VALUES ("'+datosLectura.dev_id+'",'+datosLectura.a+','+datosLectura.b+','+datosLectura.c+', (NOW()-INTERVAL 5 HOUR));');
          }
          else{
            writeLog('Parameters not found.');
            res.writeHead('405','Method not supported',{'Content-Type':'text/html'});
            res.end('<html><head><title>ERROR</title></head><body><h1>NOT SUPPORTED</h1></body></html>');
          }
        });
      }else{
        writeLog('Parameters not found.');
        res.writeHead('405','Method not supported',{'Content-Type':'text/html'});
        res.end('<html><head><title>ERROR</title></head><body><h1>NOT SUPPORTED</h1></body></html>');
      }
    break;
    case '/getdisp':
      handleDB(req,res,'SELECT id FROM cerebrou_devices;');
    break;
    */
    case '/hello':
      if(req.method=='POST'){
        writeLog('Recieved hail');
        FirstFillQueue(orders_queue);        
      }
    break;
    case '/update':

    break;
    default:
      writeLog('[404] '+req.method+' to '+req.url);
      res.writeHead('404','Not found',{'Content-Type':'text/html'});
      res.end('<html><head><title>ERROR</title></head><body><h1>NOT SUPPORTED</h1></body></html>');
  }
}).listen(8080,function(err){
  if(!err)
    writeLog('[INFO] Listening on 8080');
  else
    writeLog('[INFO] '+err.message);
  });

function enqueue(queue,element){
  queue.push(element);
}

function dequeue(queue){
  return queue.shift();
}

function FirstFillQueue(queue){
  var query1='SELECT COUNT(*) FROM cu_devices where type="W";';
  var query2='SELECT id FROM cu_devices where type="W";';
  var C = handleDB(query1);
  console.log(C);
  //for(var i=0;i<C;i++){
  //  enqueue(orders_queue,hold[i]);
  //  console.log(hold[i]);
  //}
}

