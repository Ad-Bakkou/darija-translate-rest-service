package edu.miniproject;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import com.sun.net.httpserver.HttpServer;
import jakarta.json.*;
import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;
class GeminiTranslationServiceTest {
 HttpServer server; int status=200;String body="";long delay=0;
 AtomicReference<String> received=new AtomicReference<>(),key=new AtomicReference<>(),path=new AtomicReference<>();
 @BeforeEach void start() throws Exception {
  server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
  server.createContext("/",x->{ received.set(new String(x.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));key.set(x.getRequestHeaders().getFirst("x-goog-api-key"));path.set(x.getRequestURI().toString());
   try { Thread.sleep(delay);byte[] bytes=body.getBytes(StandardCharsets.UTF_8);x.sendResponseHeaders(status,bytes.length);x.getResponseBody().write(bytes); } catch(InterruptedException e){Thread.currentThread().interrupt();} catch(IOException ignored){} finally{x.close();}
  });server.start();
 }
 @AfterEach void stop(){server.stop(0);}
 GeminiTranslationService service(Duration timeout) { return new GeminiTranslationService(new GeminiConfiguration("test-placeholder","gemini-2.5-flash"),HttpClient.newBuilder().connectTimeout(Duration.ofMillis(200)).build(),URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/v1beta/models/gemini-2.5-flash:generateContent"),timeout); }
 @Test void successAndRequestContract() {
  body="{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"text\":\"private thought\",\"thought\":true},{\"text\":\"كيف داير\"},{\"text\":\" اليوم؟\"}]}}]}";
  assertEquals("كيف داير اليوم؟",service(Duration.ofSeconds(2)).translate("Hi 😀"));
  var request=Json.createReader(new StringReader(received.get())).readObject();assertTrue(request.getJsonObject("systemInstruction").toString().contains("Moroccan Darija"));assertEquals("Hi 😀",request.getJsonArray("contents").getJsonObject(0).getJsonArray("parts").getJsonObject(0).getString("text"));assertEquals("test-placeholder",key.get());assertFalse(path.get().contains("test-placeholder"));
 }
 @ParameterizedTest @CsvSource({"401,502,UPSTREAM_AUTH_ERROR","403,502,UPSTREAM_AUTH_ERROR","429,503,UPSTREAM_RATE_LIMIT","500,503,UPSTREAM_UNAVAILABLE","503,503,UPSTREAM_UNAVAILABLE","400,502,UPSTREAM_ERROR","404,502,UPSTREAM_ERROR"})
 void upstreamErrors(int upstream,int expected,String code){status=upstream;body="sensitive provider response";var e=assertThrows(ApiException.class,()->service(Duration.ofSeconds(2)).translate("Hi"));assertEquals(expected,e.status);assertEquals(code,e.code);assertFalse(e.getMessage().contains(body));}
 @ParameterizedTest @ValueSource(strings={"","not json","{}","{\"candidates\":[]}","{\"candidates\":[{\"finishReason\":\"STOP\"}]}","{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"text\":\" \"}]}}]}","{\"candidates\":[{\"finishReason\":\"MAX_TOKENS\",\"content\":{\"parts\":[{\"text\":\"partial\"}]}}]}"})
 void malformed(String output){body=output;assertEquals("INVALID_UPSTREAM_RESPONSE",assertThrows(ApiException.class,()->service(Duration.ofSeconds(2)).translate("Hi")).code);}
 @ParameterizedTest @ValueSource(strings={"{\"promptFeedback\":{\"blockReason\":\"SAFETY\"}}","{\"candidates\":[{\"finishReason\":\"SAFETY\"}]}"})
 void blocked(String output){body=output;assertEquals(422,assertThrows(ApiException.class,()->service(Duration.ofSeconds(2)).translate("Hi")).status);}
 @Test void timeout(){delay=500;assertEquals("UPSTREAM_TIMEOUT",assertThrows(ApiException.class,()->service(Duration.ofMillis(50)).translate("Hi")).code);}
 @Test void connectionFailure(){var s=service(Duration.ofSeconds(2));server.stop(0);assertEquals("UPSTREAM_CONNECTION_ERROR",assertThrows(ApiException.class,()->s.translate("Hi")).code);}
 @Test void missingKey(){assertEquals("CONFIGURATION_ERROR",assertThrows(ApiException.class,()->new GeminiConfiguration(null,null).validate()).code);assertNull(received.get());}
 @Test void invalidModel(){assertThrows(ApiException.class,()->new GeminiConfiguration("placeholder","../invalid").validate());}
 @Test void defaultModel(){assertTrue(new GeminiConfiguration("placeholder",null).endpoint().toString().endsWith("gemini-2.5-flash:generateContent"));}
 @Test void diagnosticsDoNotLeakSecretsOrBodies() {
  var messages=new java.util.ArrayList<String>();
  var handler=new java.util.logging.Handler() {
   public void publish(java.util.logging.LogRecord r){messages.add(r.getMessage());assertNull(r.getThrown());}
   public void flush(){} public void close(){}
  };
  GeminiTranslationService.LOG.addHandler(handler);
  try {
   status=503;body="PRIVATE_PROVIDER_BODY";
   var service=service(Duration.ofSeconds(2));service.initialized(new Object());
   assertThrows(ApiException.class,()->service.translate("PRIVATE_USER_TEXT"));
   String logs=String.join("\n",messages);
   assertTrue(logs.contains("model=gemini-2.5-flash"));assertTrue(logs.contains("upstreamStatus=503"));
   assertFalse(logs.contains("test-placeholder"));assertFalse(logs.contains(body));assertFalse(logs.contains("PRIVATE_USER_TEXT"));
  } finally {GeminiTranslationService.LOG.removeHandler(handler);}
 }
 @Test void diagnosticCategories() {
  assertEquals("CONNECT_TIMEOUT",GeminiTranslationService.failureCategory(new HttpConnectTimeoutException("secret")));
  assertEquals("REQUEST_TIMEOUT",GeminiTranslationService.failureCategory(new HttpTimeoutException("secret")));
  assertEquals("TLS",GeminiTranslationService.failureCategory(new javax.net.ssl.SSLHandshakeException("secret")));
  assertEquals("DNS",GeminiTranslationService.failureCategory(new IOException(new UnknownHostException("secret"))));
  assertEquals("CONNECT",GeminiTranslationService.failureCategory(new ConnectException("secret")));
  assertEquals("INTERRUPTED",GeminiTranslationService.failureCategory(new InterruptedException("secret")));
  assertEquals("IO",GeminiTranslationService.failureCategory(new IOException("secret")));
 }
 @Test void invalidModelIsNotLogged() {assertEquals("INVALID",new GeminiConfiguration("secret","bad\nsecret").diagnosticModel());}
}
