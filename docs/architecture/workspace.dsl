workspace "Cloudflare Inquiry Web Form" "Production architecture (v0.2.0)" {
    model {
        Visitor = person "Visitor" "Submits an inquiry and receives a copy when deliverable."
        SiteOwner = person "Site owner" "Reads inquiry notifications and replies directly to visitors."
        InquiryForm = softwareSystem "Cloudflare Inquiry Web Form" "Inquiry form at https://inquiry.dceoy.com/ using Workers, Turnstile and Cloudflare Email Sending." {
            WebPage = container "Web page" "Browser-side input, confirm and done screens (public/index.html, app.js and style.css). The confirm screen hosts the Turnstile widget." "HTML, JavaScript, CSS"
            Worker = container "Contact Worker" "src/index.ts handles a single endpoint: POST /api/contact. Validates submissions and verifies the token before sending mail." "TypeScript / Cloudflare Workers" {
                Handler = component "Request handler" "Routes requests, reads at most 16 KiB of JSON and returns JSON responses." "fetch / handleContactRequest"
                Validator = component "Field validator" "Checks field lengths and email format; rejects newlines in email and subject to guard against header injection." "validateFields"
                Verifier = component "Turnstile verifier" "Uses the TURNSTILE_SECRET_KEY Worker secret. Fails closed unless Siteverify reports success, the configured action and an exact allowed hostname." "verifyTurnstile"
                Sender = component "Email sender" "Composes the owner notification with the visitor as Reply-To. Only after that send succeeds, attempts a visitor copy; copy failure does not fail the inquiry." "sendNotification / sendSenderCopy"
            }
        }
        Turnstile = softwareSystem "Cloudflare Turnstile" "Serves the browser widget and the Siteverify API at challenges.cloudflare.com." "External"
        EmailSending = softwareSystem "Cloudflare Email Sending" "Sends from EMAIL_FROM on the onboarded dceoy.com domain. No external mail provider or API key." "External"
        OwnerMailbox = softwareSystem "Owner mailbox" "Google Workspace mailbox configured by EMAIL_TO. EMAIL_TO and EMAIL_FROM are Worker secrets, never stored in Git." "External"
        VisitorMailbox = softwareSystem "Visitor mailbox" "Visitor's email provider. On Workers Free, copies can reach only verified destinations." "External"

        Visitor -> WebPage "Fills in and confirms an inquiry" "HTTPS"
        WebPage -> Turnstile "Loads the challenge widget" "HTTPS"
        WebPage -> Handler "Submits fields and token to POST /api/contact" "JSON/HTTPS"
        Handler -> Validator "Validates parsed fields" "Function call"
        Handler -> Verifier "Checks the token before sending" "Function call"
        Handler -> Sender "Sends the notification, then requests a copy" "Function calls"
        Verifier -> Turnstile "Checks the token with Siteverify" "HTTPS form POST"
        Sender -> EmailSending "Sends notification and best-effort copy" "EMAIL send_email binding"
        EmailSending -> OwnerMailbox "Delivers the inquiry notification" "Email"
        EmailSending -> VisitorMailbox "Delivers the copy if permitted" "Email"
        SiteOwner -> OwnerMailbox "Reads notification and replies to its Reply-To address" "Mail client"
        OwnerMailbox -> VisitorMailbox "Delivers the owner's direct reply" "Email"
        Visitor -> VisitorMailbox "Reads copy and replies from the site owner" "Mail client"

        deploymentEnvironment "Production" {
            deploymentNode "Cloudflare edge" "Custom Domain: inquiry.dceoy.com" {
                deploymentNode "Workers Static Assets" "Serves public/ without invoking the Worker." {
                    containerInstance WebPage
                }
                deploymentNode "Workers runtime" "Only /api/* runs the Worker first." {
                    containerInstance Worker
                }
            }
        }
    }
    views {
        systemContext InquiryForm Context "People and services involved in an inquiry and reply." {
            include *
            include SiteOwner OwnerMailbox VisitorMailbox
            autoLayout lr
        }
        container InquiryForm Containers "Browser submission, server-side verification and email delivery." {
            include *
            include SiteOwner OwnerMailbox VisitorMailbox
            autoLayout lr
        }
        component Worker WorkerComponents "Request processing inside the contact Worker." {
            include *
            autoLayout lr
        }
        deployment InquiryForm Production EdgeDeployment "Production hosting on the Cloudflare custom domain." {
            include *
            autoLayout lr
        }
        styles {
            element "Person" {
                shape Person
            }
            element "External" {
                background #586575
                color #ffffff
            }
        }
    }
}
