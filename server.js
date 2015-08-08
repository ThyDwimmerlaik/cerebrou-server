var http = require('http');
var mysql = require('mysql');
var qs = require('querystring')
var data_conn = require('../db/connection.json');

var datosLectura;
var query='';

var connection = mysql.createConnection({
  host :     data_conn.host,
  user :     data_conn.user,
  password : data_conn.pass,
  database : data_conn.database
});

http.createServer(function(req,res){
  switch(req.url){
    case '/':
      console.log('[200] '+req.method+' to '+req.url);
      res.writeHead(200,"OK",{'Content-Type':'text/html'});
      res.write('<html><head><title>Hello cerebroU!</title><head><body>');
      res.write('<form action="/getdata" method="post">');
      res.write('Switch: <input type="number" name="switch" value=""/><br/>');
      res.write('Current: <input type="number" name="current" value=""/><br/>');
      res.write('<input type="submit"/>');
      res.write('</form></body></html>');
      res.end();
    break,
    case '/getdata':
      if(req.method=='POST'){
        console.log('[200] '+req.method+' to '+req.url);
        req.on('data',function(chunk){
          datosLectura = qs.parse(String(chunk));
          console.log('Recieved data:');
          console.log(datosLectura);
        });
        req.on('end',function(){
          res.writeHead(200,'OK',{'Content-Type':'text/html'});
          res.end();
          query = 'INSERT INTO cu_lecturas (id_dispo,valor,fecha) VALUES ('+datosLectura.switch+','+datosLectura.current+', NOW());';
          console.log(query);
          connection.query(query,function(err,result){
            if(!err) console.log('Successful query!');
            else console.log(err.message);
          });
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
    console.log('Listening on 8080');
  else
    console.log(err.message);
  });