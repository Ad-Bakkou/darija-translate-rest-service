package edu.miniproject;
import jakarta.json.*;
import java.io.StringReader;
public record TranslationRequest(String text, String sourceLanguage) {
 public static TranslationRequest parse(String body) {
  if(body==null || body.isBlank()) throw invalid("Request body is required.");
  JsonObject o;
  try(var parser=Json.createParser(new StringReader(body))) {
   if(!parser.hasNext() || parser.next()!=jakarta.json.stream.JsonParser.Event.START_OBJECT) throw invalid("Request must be a JSON object.");
   o=parser.getObject();
   if(parser.hasNext()) throw invalid("Unexpected content after JSON object.");
  }
  catch(RuntimeException e) { throw invalid("Request must be a valid JSON object."); }
  if(!(o.get("text") instanceof JsonString t)) throw invalid("Text must be a string.");
  String text=t.getString();
  if(text.codePoints().allMatch(c -> Character.isWhitespace(c) || Character.isSpaceChar(c))) throw invalid("Text must not be empty.");
  if(text.codePointCount(0,text.length())>5000) throw invalid("Text must not exceed 5000 Unicode code points.");
  for(int i=0;i<text.length();i++) {
   char c=text.charAt(i);
   if(Character.isHighSurrogate(c)) { if(i+1>=text.length() || !Character.isLowSurrogate(text.charAt(++i))) throw invalid("Text contains invalid Unicode."); }
   else if(Character.isLowSurrogate(c)) throw invalid("Text contains invalid Unicode.");
  }
  String language="English";
  if(o.containsKey("sourceLanguage")) {
   if(!(o.get("sourceLanguage") instanceof JsonString s) || !s.getString().strip().equalsIgnoreCase("English")) throw invalid("Only English sourceLanguage is supported.");
  }
  return new TranslationRequest(text,language);
 }
 private static ApiException invalid(String message) { return new ApiException(400,"VALIDATION_ERROR",message); }
}
