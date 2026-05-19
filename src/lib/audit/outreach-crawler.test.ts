import { describe, expect, it } from "vitest";
import { extractOutreachSignals } from "./outreach-crawler";

describe("extractOutreachSignals", () => {
  it("extracts public emails, phone numbers, and contact form metadata", () => {
    const page = extractOutreachSignals(
      "https://example-dental.co.uk/contact",
      `
        <html>
          <head><title>Contact Example Dental</title></head>
          <body>
            <a href="mailto:reception@example-dental.co.uk">Email reception</a>
            <p>Call 01483 123456 or write to info [at] example-dental [dot] co [dot] uk</p>
            <form action="/contact" method="post">
              <label for="name">Name</label>
              <input id="name" name="name" required />
              <input name="email" type="email" placeholder="Your email" />
              <textarea name="message" placeholder="How can we help?"></textarea>
              <button type="submit">Send enquiry</button>
            </form>
          </body>
        </html>
      `
    );

    expect(page.emails).toEqual(["info@example-dental.co.uk", "reception@example-dental.co.uk"]);
    expect(page.phoneNumbers).toEqual(["01483 123456"]);
    expect(page.forms).toHaveLength(1);
    expect(page.forms[0]).toMatchObject({
      action: "https://example-dental.co.uk/contact",
      method: "POST",
      classification: "contact",
      submitText: "Send enquiry"
    });
    expect(page.forms[0].fields.map((field) => field.name)).toEqual(["name", "email", "message"]);
  });

  it("classifies booking and newsletter forms separately", () => {
    const page = extractOutreachSignals(
      "https://example-dental.co.uk",
      `
        <form id="book-appointment"><input name="phone" /><button>Book appointment</button></form>
        <form id="newsletter"><input name="email" /><button>Subscribe</button></form>
      `
    );

    expect(page.forms.map((form) => form.classification)).toEqual(["booking", "newsletter"]);
  });

  it("filters JavaScript-looking false positive email matches", () => {
    const page = extractOutreachSignals(
      "https://example-dental.co.uk",
      `
        <p>info@clinic.co.uk loc@ion.href navig@or.sendbeacon gre@outcome.john</p>
      `
    );

    expect(page.emails).toEqual(["info@clinic.co.uk"]);
  });
});
