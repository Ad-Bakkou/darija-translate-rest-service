package edu.miniproject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.*;
@Provider
public class ApiExceptionMapper implements ExceptionMapper<Exception> {
 public Response toResponse(Exception e) {
  int status=500; String code="INTERNAL_ERROR",message="An unexpected error occurred.";
  if(e instanceof ApiException a) { status=a.status;code=a.code;message=a.getMessage(); }
  else if(e instanceof WebApplicationException w) { status=w.getResponse().getStatus(); code=status==400?"VALIDATION_ERROR":"HTTP_ERROR";message=status==400?"Invalid request.":"Request could not be processed."; }
  return Response.status(status).type("application/json; charset=UTF-8").entity(new ErrorResponse(code,message).json()).build();
 }
}
