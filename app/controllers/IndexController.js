const baseController = require('./BaseController');

class IndexController extends baseController {
    /**
     * Renders the Home page
     *
     * @param req
     * @param res
     */
    indexAction(req, res) {
        res.render('index', this.mergePageConfig(req, {
            template: 'index/index',
            pageTitle: 'Home'
        }));
    }

    /**
     * Renders the 404 page
     *
     * @param req
     * @param res
     */
    notFoundAction(req, res) {
        res.render('index', this.mergePageConfig(req, {
            template: 'general/notfound',
            pageTitle: 'Not Found'
        }));
    }

    /**
     * Renders the old browser page (Fallback page)
     *
     * @param req
     * @param res
     */
    oldBrowserAction(req, res) {
        res.render('index', this.mergePageConfig(req, {
            template: 'general/oldbrowser',
            pageTitle: 'Old Browser'
        }));
    }

    /**
     * Renders the sitemap.xml
     *
     * @param req
     * @param res
     * @param routes
     */
    siteMapAction(req, res, routes) {
        res.type("application/xml");
        res.render('general/sitemap', this.mergePageConfig(req, {
            template: false,
            pageTitle: false,
            routes: routes
        }));
    }

    /**
     * Renders the robots.txt
     *
     * @param req
     * @param res
     */
    robotsAction(req, res) {
        res.type("text/plain");
        res.render('general/robots', this.mergePageConfig(req, {
            template: false,
            pageTitle: false
        }));
    }
}

module.exports = new IndexController();
