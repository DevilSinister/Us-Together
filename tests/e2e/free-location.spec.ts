import {test,expect} from "@playwright/test";
test("free place search and current location work without a key",async({page,context},info)=>{
 test.setTimeout(60000);await context.grantPermissions(["geolocation"]);await context.setGeolocation({latitude:24.86,longitude:67.01});
 await page.goto("/sign-in");await page.getByRole("button",{name:"Enter paired preview"}).click();await expect(page).toHaveURL(/\/home$/);await page.goto("/memories/new");
 await expect(page.getByRole("button",{name:"Use my location",exact:true})).toBeVisible();await page.getByRole("combobox",{name:/Location/}).fill("Karachi");
 await expect(page.getByRole("option").first()).toBeVisible({timeout:20000});await page.getByRole("combobox",{name:/Location/}).press("ArrowDown");await page.keyboard.press("Enter");await expect(page.getByRole("combobox",{name:/Location/})).toHaveValue(/Karachi/);await expect(page.getByText("Place selected.",{exact:true})).toBeVisible();
 await page.getByLabel("Memory title").fill("Free place lookup");
 await page.screenshot({path:".impeccable/qa/free-location-"+info.project.name+".png",fullPage:true});
 await page.getByRole("button",{name:"Use my location",exact:true}).click();await expect(page.getByRole("option").first()).toBeVisible({timeout:20000});await page.getByRole("option").first().getByRole("button").click();await expect(page.getByText("Place selected.",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Save the memory",exact:true}).click();await expect(page.getByRole("heading",{name:"Free place lookup",exact:true})).toBeVisible();
});
