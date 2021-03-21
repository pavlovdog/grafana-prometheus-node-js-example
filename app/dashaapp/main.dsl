context {
    input phone: string;
}

external function reportEvent(category:string): unknown;

start node root
{
    do
    {
        #connectSafe($phone);
        goto loop;
    }
    transitions {
        loop: goto loop;
    }    
}

node loop {
    do {
        wait *;
    }
    transitions {
        loop: goto loop on true;
    }
}

preprocessor digression swear_words {
    conditions { on #messageHasIntent("swear_words"); }
    do {
        #log("Event: swear_words");
        external reportEvent("swear_words");
        return;
    }
}

preprocessor digression competitor {
    conditions { on #messageHasIntent("competitor"); }
    do {
        #log("Event: competitor");
        external reportEvent("competitor");
        return;
    }
}

preprocessor digression discount {
    conditions { on #messageHasIntent("discount"); }
    do {
        #log("Event: discount");
        external reportEvent("discount");
        return;
    }
}

preprocessor digression dead_time {
    conditions { on #getIdleTime() > 8000 tags: ontick; }
    do {
        #log("Event: dead_time");
        external reportEvent("dead_time");
        #sayText("Hey, you keeping silence for too long.");
        return;
    }
}

digression close
{
    conditions { on true tags: onclosed; }
    do
    {
        exit;
    }
}
