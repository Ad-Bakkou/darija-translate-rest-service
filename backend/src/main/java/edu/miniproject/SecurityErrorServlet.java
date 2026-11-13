package edu.miniproject;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;

/** Narrow compatibility boundary for malformed-header audit failures in Liberty 25.0.0.10. */
@WebServlet("/internal/security-error")
public class SecurityErrorServlet extends HttpServlet {
    @Override
    protected void service(HttpServletRequest request, HttpServletResponse response) throws IOException {
        Object error = request.getAttribute(RequestDispatcher.ERROR_EXCEPTION);
        boolean malformed = request.getDispatcherType() == DispatcherType.ERROR
                && isMalformedBasicAuditFailure(error instanceof Throwable t ? t : null);
        response.setStatus(malformed ? 401 : 500);
        response.setContentType("application/json; charset=UTF-8");
        response.setHeader("Cache-Control", "no-store");
        if (malformed) response.setHeader("WWW-Authenticate", "Basic realm=\"Darija Translator\"");
        response.getWriter().write(malformed
                ? new ErrorResponse("UNAUTHORIZED", "Valid Basic credentials are required.").json()
                : new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred.").json());
    }

    static boolean isMalformedBasicAuditFailure(Throwable error) {
        for (Throwable current = error; current != null; current = current.getCause()) {
            if (!(current instanceof NullPointerException || current instanceof StringIndexOutOfBoundsException)) continue;
            for (StackTraceElement frame : current.getStackTrace()) {
                String type = frame.getClassName();
                if (type.startsWith("java.") || type.startsWith("jdk.") || type.startsWith("sun.")) continue;
                if (type.equals("com.ibm.ws.webcontainer.security.WebProviderAuthenticatorProxy")
                        && frame.getMethodName().equals("authenticateForOtherMechanisms")) return true;
                break; // An application exception merely called through the container is not this defect.
            }
        }
        return false;
    }
}
