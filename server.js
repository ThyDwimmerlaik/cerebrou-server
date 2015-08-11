var http = require('http');
var mysql = require('mysql');
var qs = require('querystring')
var conn = require('../db/connection.json');

var datosLectura;
var query='';

var pool = mysql.createPool({
  connectionLimit :   100,
  host :              conn.host,
  user :              conn.user,
  password :          conn.pass,
  database :          conn.database,
  debug :             false
});

function currentDate(){
  var d = newDate();
  d.setHours(d.getDate()-8);
  return d;
}

function handleDB(req,res){
  pool.getConnection(function(err,connection){
    if(err){
      connection.release();
      console.log('[100] ',err.message);
      res.writeHead(100,'Error in connection database',{'Content-Type':'text/html'});
      res.end();
      return;
    }
    console.log('[DB] Connected as id: ',connection.threadId);
    connection.query(query,function(err,result){
      if(!err) console.log('[DB] Successful query!');
      else console.log('[DB] ',err.message);
    });
    connection.on('error', function(err) {      
      console.log('[100] ',err.message);
      res.writeHead(100,'Error in connection database',{'Content-Type':'text/html'});
      res.end();
      return;
    });
  });
}

http.createServer(function(req,res){
  switch(req.url){
    case '/':
      console.log('['+currentDate()+'] '+'[200] '+req.method+' to '+req.url);
      res.writeHead(200,'OK',{'Content-Type':'text/html'});
      res.write('<html><head><title>Hello cerebroU!</title><head><body>');
      res.write('<form action="/getdata" method="post">');
      res.write('Switch: <input type="text" name="switch" value=""/><br/>');
      res.write('Current: <input type="text" name="current" value=""/><br/>');
      res.write('Current: <input type="text" name="max" value=""/><br/>');
      res.write('Current: <input type="text" name="min" value=""/><br/>');
      res.write('<input type="submit"/>');
      res.write('</form></body></html>');
      res.end();
    break;
    case '/getdata':
      if(req.method=='POST'){
        console.log('[200] '+req.method+' to '+req.url);
        req.on('data',function(chunk){
          datosLectura = qs.parse(String(chunk));
          console.log('[200] Recieved data: ',datosLectura);
        });
        req.on('end',function(){
          res.writeHead(200,'OK',{'Content-Type':'text/html'});
          res.end();
          query = 'INSERT INTO cu_lecturas (id_dispo,valor,max,min,fecha) VALUES ('+datosLectura.switch+','+datosLectura.current+','+datosLectura.max+','+datosLectura.min+', NOW());';
          //console.log(query);
          handleDB(req,res);
        });
      }else{
        console.log('[405] '+req.method+" to "+req.url);
        res.writeHead('405','Method not supported',{'Content-Type':'text/html'});
        res.end('<html><head><title>ERROR</title></head><body><h1>NOT SUPPORTED</h1></body></html>');
      }
    break;

    default:
      console.log('[404] '+req.method+" to "+req.url);
      res.writeHead('404','N',{'Content-Type':'text/html'});
      res.end('<html><head><title>ERROR</title></head><body><h1>NOT SUPPORTED</h1></body></html>');
  }
}).listen(8080,function(err){
  if(!err)
    console.log('[INFO] Listening on 8080');
  else
    console.log('[INFO] ',err.message);
  });