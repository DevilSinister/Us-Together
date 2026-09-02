import {expect,test} from "@playwright/test";
test("plans support calendar, details, checklist, reminders, rescheduling and cancellation",async({page},testInfo)=>{
 test.setTimeout(120000);
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.goto("/sign-in");await page.getByRole("button",{name:"Enter paired preview"}).click();await expect(page).toHaveURL(/home$/);
 await page.goto("/plans/new");await page.getByLabel("What are you planning?").fill("An afternoon by the sea");await page.getByLabel("Starts",{exact:true}).fill("2027-02-14T15:00");await page.getByLabel("Ends",{exact:false}).fill("2027-02-14T19:00");await page.getByLabel("Location",{exact:false}).fill("The old harbour");await page.getByLabel("Amount",{exact:true}).fill("45.50");await page.getByRole("button",{name:"Save this plan",exact:true}).click();await expect(page.getByText("Add both an amount and currency.",{exact:true})).toBeVisible();await expect(page.getByLabel("What are you planning?")).toHaveValue("An afternoon by the sea");await page.getByLabel("Currency",{exact:true}).fill("USD");await expect(page.getByLabel("Latitude",{exact:true})).toHaveCount(0);await page.getByRole("button",{name:"Save this plan",exact:true}).click();
 await expect(page.getByRole("heading",{name:"An afternoon by the sea"})).toBeVisible();const planUrl=page.url();
 await expect(page.getByText("Budget: USD 45.50")).toBeVisible();await expect(page.getByText("Coordinates: 24.86, 67.01")).toHaveCount(0);
 for(const label of ["Pack a blanket","Bring coffee"]){await page.getByLabel("Next little step").fill(label);await page.getByRole("button",{name:"Add step",exact:true}).click();await expect(page.getByLabel("Next little step")).toHaveValue("");}
 await page.getByRole("button",{name:"Move Bring coffee up",exact:true}).focus();await page.keyboard.press("Enter");await expect(page.getByLabel("Step 1",{exact:true})).toHaveValue("Bring coffee");
 await page.getByRole("checkbox",{name:"Complete Bring coffee",exact:true}).click();await expect(page.getByRole("checkbox",{name:"Complete Bring coffee",exact:true})).toBeChecked();await expect(page.getByText("1 of 2 done",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Add reminder",exact:true}).click();await expect(page.getByText("60 minutes before",{exact:true})).toBeVisible();
 await page.getByRole("link",{name:"Edit plan",exact:true}).click();await expect(page.getByLabel("Amount",{exact:true})).toHaveValue("45.50");await page.getByLabel("Starts",{exact:true}).fill("2027-02-14T16:00");await page.getByRole("button",{name:"Save changes",exact:true}).click();await expect(page.getByRole("heading",{name:"An afternoon by the sea"})).toBeVisible();
 await page.screenshot({path:"test-results/plans-detail-"+testInfo.project.name+".png",fullPage:true});
 await page.getByRole("link",{name:"Back to plans",exact:true}).click();
 await page.getByRole("button",{name:"Month",exact:true}).click();
 // Navigate from the runtime month using the visible calendar heading.
 for(let i=0;i<18&&!await page.getByRole("heading",{name:"February 2027",exact:true}).isVisible();i++){await page.getByRole("button",{name:"Next month",exact:true}).click();await expect(page.getByRole("button",{name:"Next month",exact:true})).toBeEnabled();}
 await expect(page.getByRole("heading",{name:"February 2027",exact:true})).toBeVisible();
 await page.getByRole("button",{name:/Sun, Feb 14, 1 plans/}).click();await expect(page.getByRole("link",{name:"An afternoon by the sea",exact:true})).toBeVisible();
 await page.screenshot({path:"test-results/plans-month-"+testInfo.project.name+".png",fullPage:true});
 await page.getByRole("button",{name:"Week",exact:true}).click();await expect(page.getByRole("button",{name:"Previous week"})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false);
 await page.goto(planUrl);await page.getByRole("button",{name:"Cancel plan",exact:true}).click();await expect(page.getByText("date · cancelled",{exact:true})).toBeVisible();await expect(page.getByText(/· cancelled/)).toHaveCount(2);
 await page.getByRole("button",{name:"Restore plan",exact:true}).click();await expect(page.getByRole("button",{name:"Mark complete",exact:true})).toBeVisible();
 await page.getByText("Delete this plan",{exact:true}).click();await page.getByLabel("Type DELETE to confirm",{exact:true}).fill("DELETE");await page.getByRole("button",{name:"Delete plan permanently",exact:true}).click();await expect(page).toHaveURL(/\/plans$/);
 await page.goto(planUrl);await expect(page.getByText(/could not be found|not found/i).first()).toBeVisible();
});
