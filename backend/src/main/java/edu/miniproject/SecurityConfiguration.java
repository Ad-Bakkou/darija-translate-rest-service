package edu.miniproject;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.security.enterprise.AuthenticationStatus;
import jakarta.security.enterprise.authentication.mechanism.http.HttpAuthenticationMechanism;
import jakarta.security.enterprise.authentication.mechanism.http.HttpMessageContext;
import jakarta.security.enterprise.credential.BasicAuthenticationCredential;
import jakarta.security.enterprise.identitystore.IdentityStoreHandler;
import jakarta.security.enterprise.identitystore.CredentialValidationResult.Status;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Jakarta Security mechanism, invoked by Liberty's Jakarta Authentication bridge. */
@ApplicationScoped
public class SecurityConfiguration implements HttpAuthenticationMechanism {
    @Inject IdentityStoreHandler identities;

    @Override
    public AuthenticationStatus validateRequest(HttpServletRequest request,
            HttpServletResponse response, HttpMessageContext context) {
        if (!context.isProtected()) return context.doNothing();
        String header = request.getHeader("Authorization");
        if (header != null && header.regionMatches(true, 0, "Basic ", 0, 6)
                && header.substring(6).matches("[A-Za-z0-9+/]+={0,2}")) {
            BasicAuthenticationCredential credential = null;
            try {
                // Use the Jakarta credential parser, not a custom Base64/password implementation.
                credential = new BasicAuthenticationCredential(header.substring(6));
                var result = identities.validate(credential);
                if (result.getStatus() == Status.VALID) {
                    context.getMessageInfo().getMap().put("jakarta.servlet.http.authType", "BASIC");
                    return context.notifyContainerAboutLogin(result);
                }
            } catch (IllegalArgumentException | IndexOutOfBoundsException malformed) {
                // Invalid encoding or missing separator: identical safe challenge, no details logged.
            } finally {
                if (credential != null) credential.getPassword().clear();
            }
        }
        response.setHeader("WWW-Authenticate", "Basic realm=\"Darija Translator\"");
        response.setHeader("Cache-Control", "no-store");
        return context.responseUnauthorized();
    }
}
