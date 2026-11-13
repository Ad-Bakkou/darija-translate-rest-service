package edu.miniproject;

import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.nio.file.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.zip.*;
import java.io.*;
import static org.junit.jupiter.api.Assertions.*;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SecurityIT {
 Path target=Path.of("target").toAbsolutePath(), userDir, serverDir, calls;
 String username="it-"+UUID.randomUUID(), password=UUID.randomUUID().toString();
 int port; Process process;
 HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
 String serverXml;
 @BeforeAll void setup() throws Exception {
  try(var socket=new ServerSocket(0,0,InetAddress.getLoopbackAddress())) {port=socket.getLocalPort();}
  userDir=target.resolve("security-it-"+UUID.randomUUID());serverDir=userDir.resolve("servers/securityIT");calls=userDir.resolve("calls.txt");
  Files.createDirectories(serverDir.resolve("apps"));
  serverXml=Files.readString(Path.of("src/main/liberty/config/server.xml")).replace("httpPort=\"9080\"","httpPort=\""+port+"\"");
  Files.writeString(serverDir.resolve("server.xml"),serverXml);
  try(var source=new ZipInputStream(Files.newInputStream(target.resolve("darija-backend.war")));var out=new ZipOutputStream(Files.newOutputStream(serverDir.resolve("apps/darija-backend.war")))) {
   for(ZipEntry entry;(entry=source.getNextEntry())!=null;) {out.putNextEntry(new ZipEntry(entry.getName()));source.transferTo(out);out.closeEntry();}
   String name="edu/miniproject/SecurityTestTranslationService.class";
   out.putNextEntry(new ZipEntry("WEB-INF/classes/"+name));Files.copy(target.resolve("test-classes").resolve(name),out);out.closeEntry();
  }
  start(username,password);
 }
 void start(String user,String pass) throws Exception {
  var builder=command("run");
  if(user!=null) builder.environment().put("TRANSLATOR_USERNAME",user);else builder.environment().remove("TRANSLATOR_USERNAME");
  if(pass!=null) builder.environment().put("TRANSLATOR_PASSWORD",pass);else builder.environment().remove("TRANSLATOR_PASSWORD");
  builder.environment().remove("GEMINI_API_KEY");
  builder.environment().put("SECURITY_TEST_CALLS",calls.toString());
  process=builder.redirectErrorStream(true).redirectOutput(ProcessBuilder.Redirect.appendTo(userDir.resolve("process.log").toFile())).start();
  long deadline=System.nanoTime()+Duration.ofSeconds(90).toNanos();
  while(System.nanoTime()<deadline) {
   if(!process.isAlive()) throw new AssertionError("Test Liberty exited; inspect target/security-it-*/process.log");
   try { if(request("GET","/api/health",null,"").statusCode()==200) return; } catch(IOException ignored){}
   Thread.sleep(300);
  }
  throw new AssertionError("Test Liberty did not become ready; inspect test logs");
 }
 ProcessBuilder command(String action) {
  var script=target.resolve("security-runtime/wlp/bin/server.bat");
  var builder=new ProcessBuilder("cmd.exe","/c",script.toString(),action,"securityIT");
  builder.environment().put("WLP_USER_DIR",userDir.toString());
  return builder;
 }
 void stop() throws Exception {
  if(process!=null && process.isAlive()) {
   var stop=command("stop").redirectErrorStream(true).redirectOutput(ProcessBuilder.Redirect.appendTo(userDir.resolve("stop.log").toFile())).start();
   if(!stop.waitFor(30,java.util.concurrent.TimeUnit.SECONDS)) stop.destroyForcibly();
   if(!process.waitFor(10,java.util.concurrent.TimeUnit.SECONDS)) { process.descendants().forEach(ProcessHandle::destroyForcibly);process.destroyForcibly(); }
  }
 }
 @AfterAll void cleanup() throws Exception {stop();}
 String auth(String user,String pass){return "Basic "+Base64.getEncoder().encodeToString((user+":"+pass).getBytes(StandardCharsets.UTF_8));}
 HttpResponse<String> request(String method,String path,String auth,String body) throws Exception {
  var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).timeout(Duration.ofSeconds(10)).header("Content-Type","application/json");
  if(auth!=null)builder.header("Authorization",auth);
  return client.send(builder.method(method,HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
 }
 long count() throws Exception {return Files.exists(calls)?Files.readAllLines(calls).size():0;}
 void rejected(String header) throws Exception {
  long before=count();var r=request("POST","/api/translate",header,"{\"text\":\"How are you today?\"}");
  assertEquals(401,r.statusCode());assertTrue(r.headers().firstValue("WWW-Authenticate").orElse("").startsWith("Basic"));assertEquals(before,count());
  assertFalse(r.body().contains(password));assertFalse(r.body().contains(auth(username,password)));
 }
 @Test @Order(1) void publicHealth() throws Exception {var r=request("GET","/api/health",null,"");assertEquals(200,r.statusCode());assertEquals("{\"status\":\"UP\"}",r.body());}
 @Test @Order(2) void missingHeader() throws Exception {rejected(null);}
 @Test @Order(2) void wrongUser() throws Exception {rejected(auth("wrong",password));}
 @Test @Order(2) void wrongPassword() throws Exception {rejected(auth(username,"wrong"));}
 @ParameterizedTest @Order(2) @ValueSource(strings={"Basic","Basic !!!","Basic bm9jb2xvbg==","Bearer wrong"}) void malformed(String header) throws Exception {rejected(header);}
 @ParameterizedTest @Order(3) @ValueSource(strings={"/api/translate/","/api/translate/child","/api/translate;parameter=value","/api//translate","/api/%74ranslate","/internal/security-error"}) void alternatePaths(String path) throws Exception {long before=count();var r=request("POST",path,null,"{}");assertEquals(401,r.statusCode());assertEquals(before,count());}
 @ParameterizedTest @Order(3) @ValueSource(strings={"GET","PUT","DELETE","OPTIONS","HEAD"}) void methodVariations(String method) throws Exception {assertEquals(401,request(method,"/api/translate",null,"{}").statusCode());}
 @Test @Order(4) void validAuthenticationAndJson() throws Exception {
  long before=count();var r=request("POST","/api/translate",auth(username,password),"{\"text\":\"How are you today?\"}");assertEquals(200,r.statusCode());assertTrue(r.body().contains("كيف داير اليوم؟"));assertTrue(r.body().contains("Moroccan Darija"));assertEquals(before+1,count());
 }
 @Test @Order(4) void authenticatedInvalidJson() throws Exception {long before=count();var r=request("POST","/api/translate",auth(username,password),"{");assertEquals(400,r.statusCode());assertTrue(r.body().contains("VALIDATION_ERROR"));assertEquals(before,count());}
 @Test @Order(5) void noCredentialLeakage() throws Exception {try(var paths=Files.walk(serverDir.resolve("logs"))) {
  for(Path path:paths.filter(p->p.toString().endsWith(".log")).toList()) {String logs=Files.readString(path);assertFalse(logs.contains(password));assertFalse(logs.contains(auth(username,password)));assertFalse(logs.contains("GEMINI_DIAGNOSTIC"));}
 }}
 @Test @Order(5) void cookiesDoNotReplaceBasicCredentials() throws Exception {
  var authenticated=request("POST","/api/translate",auth(username,password),"{");
  assertEquals(400,authenticated.statusCode());
  String cookies=String.join("; ",authenticated.headers().allValues("Set-Cookie").stream().map(v->v.split(";",2)[0]).toList());
  var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/translate")).POST(HttpRequest.BodyPublishers.ofString("{}"));
  if(!cookies.isEmpty())builder.header("Cookie",cookies);
  assertEquals(401,client.send(builder.build(),HttpResponse.BodyHandlers.ofString()).statusCode());
 }
 @Test @Order(6) void restartPreservesSecurity() throws Exception {stop();start(username,password);rejected(null);assertEquals(400,request("POST","/api/translate",auth(username,password),"{").statusCode());}
 @Test @Order(7) void roleDenied() throws Exception {stop();Files.writeString(serverDir.resolve("server.xml"),serverXml.replace("translators", "unassigned"));start(username,password);long before=count();assertEquals(403,request("POST","/api/translate",auth(username,password),"{}").statusCode());assertEquals(before,count());}
 @Test @Order(8) void missingConfigurationFailsClosed() throws Exception {stop();Files.writeString(serverDir.resolve("server.xml"),serverXml);start(null,null);rejected(auth(username,password));assertEquals(200,request("GET","/api/health",null,"").statusCode());}
 @Test @Order(9) void blankConfigurationFailsClosed() throws Exception {stop();start("","");rejected(auth("",""));assertEquals(200,request("GET","/api/health",null,"").statusCode());}
}
