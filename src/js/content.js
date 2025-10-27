function onLinkUpdate(element) {
    browser.runtime.sendMessage({
        type: "faviconUpdate",
        url: element.href
    }).then(res => {
        if (res) element.href = res.url
    })
}

const faviconLinks = [...document.querySelectorAll("link[rel~=icon]")]

// So that websites that don't include a <link> element also have its favicon
// corrected
if (faviconLinks.length === 0) {
    const link = document.createElement("link")
    link.rel = "icon"
    link.href = "/favicon.ico"

    // Add it now if the page already loaded, otherwise wait for load to finish
    if (document.readyState === "complete")
        document.head.appendChild(link)
    else
        addEventListener("load", () => document.head.appendChild(link))

    faviconLinks.push(link)
}

const mo = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (mutation.target.href !== mutation.oldValue) {
            onLinkUpdate(mutation.target)
        }
    })
})

for (const link of faviconLinks) {
    // 'onLinkUpdate' is called here so that the favicon is updated when the
    // page first loads and when the addon is installed
    onLinkUpdate(link)

    mo.observe(link, {
        attributeFilter: ["href"],
        attributeOldValue: true
    })
}
