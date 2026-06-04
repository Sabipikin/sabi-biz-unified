const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isValidEmail(email) {
  if (!email) return true;
  return EMAIL_RE.test(String(email).trim());
}

function validateCustomerData(data) {
  const errors = {};
  const cleaned = Object.assign({}, data);

  if (!cleaned.name || !String(cleaned.name).trim()) {
    errors.name = 'Name is required.';
  }

  if (cleaned.email && !isValidEmail(cleaned.email)) {
    errors.email = 'Invalid email address.';
  }

  if (cleaned.phone && String(cleaned.phone).replace(/[^0-9+]/g, '').length < 7) {
    errors.phone = 'Please enter a valid phone number.';
  }

  const dateFields = ['birthday', 'anniversary'];
  for (const f of dateFields) {
    if (cleaned[f]) {
      const ts = Date.parse(cleaned[f]);
      if (Number.isNaN(ts)) {
        errors[f] = 'Invalid date format.';
      }
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

module.exports = { isValidEmail, validateCustomerData };
