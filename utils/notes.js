/**
 * Returns an object of voucher notes
 *
 * @param string
 * @returns {*}
 */
module.exports = (string) => {
    if(string === null || typeof string === 'undefined') {
        return {
            note: null,
            source: null,
            auth_type: null,
            auth_oidc_domain: null,
            auth_oidc_user: null
        };
    }

    const match = string.match(/^(?:(?<note>.*?)\|\|;;\|\|(?<source>[^|]*)\|\|;;\|\|(?<auth_type>[^|]*)\|\|;;\|\|(?<auth_oidc_domain>[^|]*)(?:\|\|;;\|\|(?<auth_oidc_user>[^|]*))?|(?<note_only>.+))$/);
    const { note, source, auth_type, auth_oidc_domain, auth_oidc_user, note_only } = match.groups;

    return {
        note: note || note_only,
        source: source || null,
        auth_type: auth_type || null,
        auth_oidc_domain: auth_oidc_domain || null,
        auth_oidc_user: auth_oidc_user || null
    };
}
