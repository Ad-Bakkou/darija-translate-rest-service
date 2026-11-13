package edu.miniproject;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import jakarta.json.*;
import java.io.StringReader;
import static org.junit.jupiter.api.Assertions.*;
class TranslatorResourceTest {
 TranslatorResource resource=new TranslatorResource(text -> "كيف داير اليوم؟");
 @Test void successAndStructure() {
  var result=Json.createReader(new StringReader(resource.translate("{\"text\":\"How are you today?\",\"sourceLanguage\":\"English\"}"))).readObject();
  assertEquals(4,result.size());assertEquals("How are you today?",result.getString("originalText"));assertEquals("كيف داير اليوم؟",result.getString("translatedText"));assertEquals("English",result.getString("sourceLanguage"));assertEquals("Moroccan Darija",result.getString("targetLanguage"));
 }
 @ParameterizedTest @NullAndEmptySource @ValueSource(strings={" ","{}","null","[]","{", "{} trailing","{\"text\":null}","{\"text\":\"\"}","{\"text\":\"   \"}","{\"text\":42}","{\"text\":true}","{\"text\":[]}","{\"text\":{}}","{\"text\":\"hello\",\"sourceLanguage\":42}","{\"text\":\"hello\",\"sourceLanguage\":\"French\"}"})
 void invalid(String body) { var e=assertThrows(ApiException.class,()->resource.translate(body));assertEquals(400,e.status);assertEquals("VALIDATION_ERROR",e.code); }
 @Test void trailingGarbage() { assertThrows(ApiException.class,()->resource.translate("{\"text\":\"Hi\"} trailing")); }
 @Test void trailingObject() { assertThrows(ApiException.class,()->resource.translate("{\"text\":\"Hi\"} {}")); }
 @Test void tooLong() { assertThrows(ApiException.class,()->resource.translate(Json.createObjectBuilder().add("text","a".repeat(5001)).build().toString())); }
 @Test void unicodeBoundaryAndPreservation() { String text="😀".repeat(5000);var out=resource.translate(Json.createObjectBuilder().add("text",text).build().toString());assertEquals(text,Json.createReader(new StringReader(out)).readObject().getString("originalText")); }
 @Test void rejectsOverLimitSupplementary() { assertThrows(ApiException.class,()->resource.translate(Json.createObjectBuilder().add("text","😀".repeat(5001)).build().toString())); }
 @Test void serviceFailurePropagates() { var r=new TranslatorResource(t->{throw new ApiException(504,"UPSTREAM_TIMEOUT","Timeout");});assertEquals(504,assertThrows(ApiException.class,()->r.translate("{\"text\":\"Hi\"}")).status); }
 @Test void emptyServiceResultRejected() { assertThrows(ApiException.class,()->new TranslatorResource(t->"").translate("{\"text\":\"Hi\"}")); }
}
