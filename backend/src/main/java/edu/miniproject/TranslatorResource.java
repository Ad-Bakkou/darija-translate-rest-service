package edu.miniproject;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
@Path("/translate")
@Consumes("application/json")
@Produces("application/json; charset=UTF-8")
public class TranslatorResource {
 @Inject TranslationService service;
 public TranslatorResource() {}
 TranslatorResource(TranslationService service) { this.service=service; }
 @POST public String translate(String body) {
  var request=TranslationRequest.parse(body);
  String translated=service.translate(request.text());
  if(translated==null || translated.isBlank()) throw new ApiException(502,"INVALID_UPSTREAM_RESPONSE","Translation provider returned no usable translation.");
  return new TranslationResponse(request.text(),translated,request.sourceLanguage(),"Moroccan Darija").json();
 }
}
