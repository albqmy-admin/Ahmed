import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Link } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Admin from "./pages/Admin";
import Home from "./pages/Home";

function MissingPage() {
  return <main className="missing-page" dir="rtl"><div><span className="section-kicker">مكتب البقمي 2</span><h1>الصفحة غير متاحة</h1><p>يمكنك العودة إلى صفحة الخدمات ومتابعة طلبك من هناك.</p><Link className="button button-dark" href="/">العودة للرئيسية</Link></div></main>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={Admin} />
      <Route component={MissingPage} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
